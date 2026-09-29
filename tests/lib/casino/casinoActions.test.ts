import { type TestifyClient } from "@core/client";
import { getCasinoSettings } from "@database/repositories/casinoRepository";
import { recordCasinoPlays } from "@database/repositories/casinoStatsRepository";
import { adjustWallet, debitWallet, incrementCounters, requireAccount } from "@database/repositories/economyRepository";
import { playInstant, type Responder, takeStake } from "@lib/casino/casinoActions.util";
import { type InstantOutcome } from "@lib/casino/instantGames.util";
import { textOf } from "@tests/helpers/containers";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/casinoRepository", () => ({ getCasinoSettings: jest.fn() }));
jest.mock("@database/repositories/casinoStatsRepository", () => ({ recordCasinoPlays: jest.fn() }));
jest.mock("@database/repositories/economyRepository", () => ({
	requireAccount: jest.fn(),
	debitWallet: jest.fn(),
	adjustWallet: jest.fn(),
	incrementCounters: jest.fn(() => Promise.resolve()),
}));

const PLAYER = { guildId: "900000000000000001", userId: "100000000000000001" };
let wallet: number;

function outcome(returned: number): InstantOutcome {
	return {
		game: "coinflip",
		betLine: "Heads",
		returned,
		result: "The coin landed on **heads**.",
		again: "heads",
		file: "coinflip",
		animate: () => ({ gif: Buffer.from("GIF89a"), durationMs: 1_000 }),
		still: () => Buffer.from("PNG"),
	};
}

function responder(): Responder & { edits: unknown[] } {
	const edits: unknown[] = [];
	return {
		deferred: false,
		replied: false,
		edits,
		deferReply: jest.fn(() => Promise.resolve()),
		editReply: jest.fn((options: unknown) => {
			edits.push(options);
			return Promise.resolve();
		}),
	};
}

/** Runs a scheduled reveal at once, so the test sees the settled message without waiting. */
function clientRunningTimers(): TestifyClient {
	const client = createMockClient();
	(client.timers as unknown as { after: jest.Mock }).after = jest.fn(
		(_name: string, _ms: number, task: () => Promise<void>) => {
			void task();
		},
	);
	return client;
}

beforeEach(() => {
	jest.clearAllMocks();
	wallet = 1_000;
	jest.mocked(getCasinoSettings).mockResolvedValue(null);
	jest.mocked(requireAccount).mockImplementation(() => Promise.resolve({ wallet } as never));
	jest.mocked(debitWallet).mockImplementation((_guild, _user, amount) => {
		if (wallet < amount) return Promise.resolve(null);
		wallet -= amount;
		return Promise.resolve({ wallet } as never);
	});
	jest.mocked(adjustWallet).mockImplementation((_guild, _user, amount) => {
		wallet += amount;
		return Promise.resolve({ wallet } as never);
	});
});

describe("taking a stake", () => {
	it("takes the bet from the wallet and counts the game", async () => {
		expect(await takeStake(PLAYER, "250")).toEqual({ bet: 250, wallet: 750 });
		expect(incrementCounters).toHaveBeenCalledWith(PLAYER.guildId, PLAYER.userId, { gambled: 1 });
	});

	it("understands half and all", async () => {
		expect((await takeStake(PLAYER, "half")).bet).toBe(500);
		expect((await takeStake(PLAYER, "all")).bet).toBe(500);
	});

	/** A limit checked after the debit would take money for a game that is then refused. */
	it("refuses a bet outside the table's limits before any money moves", async () => {
		jest.mocked(getCasinoSettings).mockResolvedValue({ enabled: true, disabledGames: [], minBet: 100, maxBet: 500 });

		await expect(takeStake(PLAYER, "50")).rejects.toThrow(/smallest bet/);
		await expect(takeStake(PLAYER, "600")).rejects.toThrow(/largest bet/);
		expect(debitWallet).not.toHaveBeenCalled();
	});

	it("refuses more than the wallet holds", async () => {
		await expect(takeStake(PLAYER, "5000")).rejects.toThrow(/more in your wallet/);
		expect(wallet).toBe(1_000);
	});
});

describe("an instant game", () => {
	it("takes the stake, pays the win at once, then shows the spin and the result", async () => {
		const reply = responder();

		await playInstant(reply, clientRunningTimers(), PLAYER, "100", () => outcome(195));
		await Promise.resolve();

		expect(wallet).toBe(1_095);
		expect(recordCasinoPlays).toHaveBeenCalledWith([{ ...PLAYER, game: "coinflip", staked: 100, returned: 195 }]);
		expect(reply.deferReply).toHaveBeenCalled();
		expect(reply.edits).toHaveLength(2);
		expect(textOf(reply.edits[0] as never)).toContain("Good luck");
		expect(textOf(reply.edits[1] as never)).toContain("you won 95");
	});

	it("keeps the stake on a loss", async () => {
		await playInstant(responder(), clientRunningTimers(), PLAYER, "100", () => outcome(0));

		expect(wallet).toBe(900);
		expect(adjustWallet).not.toHaveBeenCalled();
	});

	it("waits for the animation before revealing the result", async () => {
		const client = createMockClient();
		const after = jest.fn();
		(client.timers as unknown as { after: jest.Mock }).after = after;

		await playInstant(responder(), client, PLAYER, "100", () => outcome(0));

		expect(after.mock.calls[0]?.[1]).toBeGreaterThan(1_000);
	});

	/** A render takes a moment; a second press in that moment would start a second debit. */
	it("deals one game at a time to a player", async () => {
		let release: () => void = () => undefined;
		let reached: () => void = () => undefined;
		const dealing = new Promise<void>((resolve) => (reached = resolve));
		const slow = responder();
		slow.deferReply = jest.fn(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
					reached();
				}),
		);

		const first = playInstant(slow, clientRunningTimers(), PLAYER, "100", () => outcome(0));
		await dealing;

		await expect(playInstant(responder(), clientRunningTimers(), PLAYER, "100", () => outcome(0))).rejects.toThrow(
			/still being dealt/,
		);

		release();
		await first;
		await expect(
			playInstant(responder(), clientRunningTimers(), PLAYER, "100", () => outcome(0)),
		).resolves.toBeUndefined();
	});
});
