import { Types } from "mongoose";
import { type RoundRecord } from "@database/repositories/rouletteRepository";
import { ROULETTE_ROUND } from "@lib/casino/casino.constants";
import {
	changeChip,
	clearMyBets,
	openingChip,
	openRound,
	placeBets,
	spinNow,
	spinOverdueRounds,
	spinRound,
} from "@lib/casino/rouletteActions.util";
import { textOf } from "@tests/helpers/containers";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/rouletteRepository", () => ({
	openRound: jest.fn(),
	attachRoundMessage: jest.fn(),
	findRound: jest.fn(),
	addBets: jest.fn(),
	startClock: jest.fn(() => Promise.resolve(true)),
	setSeatChip: jest.fn(),
	clearBets: jest.fn(),
	claimRound: jest.fn(),
	finishRound: jest.fn(),
	recentPockets: jest.fn(() => Promise.resolve([])),
	overdueRounds: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/casinoStatsRepository", () => ({ recordCasinoPlays: jest.fn() }));
jest.mock("@lib/casino/casinoActions.util", () => ({
	takeStake: jest.fn((_player: unknown, amount: string) => Promise.resolve({ bet: Number(amount), wallet: 0 })),
	payOut: jest.fn(() => Promise.resolve(0)),
}));
jest.mock("@database/repositories/economyRepository", () => ({
	requireAccount: jest.fn(() => Promise.resolve({ wallet: 1_000 })),
}));
jest.mock("@lib/casino/casinoSettings.util", () => ({
	...jest.requireActual<object>("@lib/casino/casinoSettings.util"),
	readCasinoSettings: jest.fn(() => Promise.resolve({ minBet: 1, maxBet: 2_000 })),
}));
jest.mock("@lib/canvas/rouletteWheel.util", () => ({
	rouletteSpin: jest.fn(() => ({ gif: Buffer.from("GIF"), durationMs: 3_000 })),
	rouletteStill: jest.fn(() => Buffer.from("PNG")),
}));

const repository = jest.requireMock("@database/repositories/rouletteRepository");
const { recordCasinoPlays } = jest.requireMock("@database/repositories/casinoStatsRepository");
const { takeStake, payOut } = jest.requireMock("@lib/casino/casinoActions.util");
const { requireAccount } = jest.requireMock("@database/repositories/economyRepository");

const ROUND = "65f000000000000000000001";
const ALICE = { guildId: "111111111111111111", userId: "222222222222222222", name: "alice" };
const NOW = 1_700_000_000_000;

function record(overrides: Partial<RoundRecord> = {}): RoundRecord {
	return {
		_id: new Types.ObjectId(ROUND),
		guildId: ALICE.guildId,
		channelId: "444444444444444444",
		messageId: "555555555555555555",
		hostId: ALICE.userId,
		chip: 100,
		status: "betting",
		closesAt: null,
		pocket: null,
		players: {},
		expiresAt: new Date(NOW + 86_400_000),
		createdAt: new Date(NOW),
		updatedAt: new Date(NOW),
		...overrides,
	};
}

function client(edit: jest.Mock = jest.fn(() => Promise.resolve())) {
	return createMockClient({
		channels: { fetch: jest.fn(() => Promise.resolve({ isTextBased: () => true, messages: { edit } })) },
		logger: { debug: jest.fn() },
	} as never);
}

beforeEach(() => {
	jest.clearAllMocks();
	repository.startClock.mockResolvedValue(true);
});

describe("opening a round", () => {
	/** The countdown belongs to the first bet, so an empty table waits however long it takes. */
	it("opens with no countdown and sets no timer", async () => {
		repository.openRound.mockResolvedValue(record());
		const bot = client();

		await openRound(
			{ guildId: ALICE.guildId, channelId: "4", messageId: null },
			{ userId: ALICE.userId, name: "alice", private: true },
			100,
			NOW,
		);

		expect(repository.openRound).toHaveBeenCalledWith(
			expect.objectContaining({ closesAt: null, hostId: ALICE.userId, hostName: "alice", private: true }),
		);
		expect(bot.timers.after).not.toHaveBeenCalled();
	});

	/** The command no longer asks for an amount, so the opening chip has to respect the server's own limits. */
	it("opens with the usual chip, moved inside the server's bet limits", () => {
		expect(openingChip({ minBet: 1, maxBet: null })).toBe(ROULETTE_ROUND.defaultChip);
		expect(openingChip({ minBet: 500, maxBet: null })).toBe(500);
		expect(openingChip({ minBet: 1, maxBet: 50 })).toBe(50);
	});
});

describe("placing bets", () => {
	it("takes the stake, starts the countdown on the first bet, and sets one timer", async () => {
		repository.findRound.mockResolvedValue(record());
		repository.addBets.mockResolvedValue(record());
		const bot = client();

		await placeBets(bot, ALICE, ROUND, [{ kind: "red" }, { kind: "number", number: 17 }], NOW);

		expect(takeStake).toHaveBeenCalledWith(ALICE, "200");
		expect(repository.startClock).toHaveBeenCalledWith(
			ROUND,
			new Date(NOW + ROULETTE_ROUND.bettingMs),
			expect.any(Date),
		);
		expect(bot.timers.after).toHaveBeenCalledWith(`roulette-${ROUND}`, ROULETTE_ROUND.bettingMs, expect.any(Function));
		expect(repository.addBets).toHaveBeenCalledWith(
			ROUND,
			{ userId: ALICE.userId, name: "alice" },
			[
				{ spot: "red", amount: 100 },
				{ spot: "n17", amount: 100 },
			],
			ROULETTE_ROUND.maxBets,
			NOW,
		);
	});

	/** Later bets must not restart the clock, or a busy table would never spin. */
	it("leaves a running countdown alone", async () => {
		repository.findRound.mockResolvedValue(record({ closesAt: new Date(NOW + 10_000) }));
		repository.addBets.mockResolvedValue(record());
		const bot = client();

		await placeBets(bot, ALICE, ROUND, [{ kind: "odd" }], NOW);

		expect(repository.startClock).not.toHaveBeenCalled();
		expect(bot.timers.after).not.toHaveBeenCalled();
	});

	it("sets no second timer when another first bet started the clock a moment earlier", async () => {
		repository.findRound.mockResolvedValue(record());
		repository.addBets.mockResolvedValue(record());
		repository.startClock.mockResolvedValue(false);
		const bot = client();

		await placeBets(bot, ALICE, ROUND, [{ kind: "odd" }], NOW);

		expect(bot.timers.after).not.toHaveBeenCalled();
	});

	it("bets with the player's own chip once they have changed it", async () => {
		repository.findRound.mockResolvedValue(
			record({ players: { [ALICE.userId]: { name: "alice", joinedAt: 1, chip: 750, bets: [] } } }),
		);
		repository.addBets.mockResolvedValue(record());

		await placeBets(client(), ALICE, ROUND, [{ kind: "even" }], NOW);

		expect(takeStake).toHaveBeenCalledWith(ALICE, "750");
	});

	/** The stake leaves first, so a bet that could not land has to come straight back. */
	it("hands the stake back when the table closed or filled before the bet landed", async () => {
		repository.findRound.mockResolvedValue(record());
		repository.addBets.mockResolvedValue(null);

		await expect(placeBets(client(), ALICE, ROUND, [{ kind: "red" }], NOW)).rejects.toThrow(/chips are back/);
		expect(payOut).toHaveBeenCalledWith(ALICE, 100);
	});

	it("refuses past the most bets one player may place, before taking anything", async () => {
		const full = Array.from({ length: ROULETTE_ROUND.maxBets }, () => ({ spot: "red", amount: 1 }));
		repository.findRound.mockResolvedValue(
			record({ players: { [ALICE.userId]: { name: "a", joinedAt: 1, bets: full } } }),
		);

		await expect(placeBets(client(), ALICE, ROUND, [{ kind: "red" }], NOW)).rejects.toThrow(/already have 10/);
		expect(takeStake).not.toHaveBeenCalled();
	});

	/** The buttons are the same for everybody, so a bet the wallet cannot cover has to say what it holds. */
	it("refuses a bet the wallet cannot cover, naming the balance, before taking anything", async () => {
		repository.findRound.mockResolvedValue(
			record({ players: { [ALICE.userId]: { name: "alice", joinedAt: 1, chip: 500, bets: [] } } }),
		);
		requireAccount.mockResolvedValueOnce({ wallet: 300 });

		await expect(placeBets(client(), ALICE, ROUND, [{ kind: "red" }], NOW)).rejects.toThrow(
			/needs \*\*500\*\* and you have \*\*300\*\* in your wallet/,
		);
		expect(takeStake).not.toHaveBeenCalled();
	});

	/** A private table is the host's alone; anybody else is refused before a coin moves. */
	it("refuses anybody but the host at a private table", async () => {
		const BOB = { ...ALICE, userId: "333333333333333333", name: "bob" };
		repository.findRound.mockResolvedValue(record({ private: true, hostName: "alice" }));
		repository.addBets.mockResolvedValue(record());

		await expect(placeBets(client(), BOB, ROUND, [{ kind: "red" }], NOW)).rejects.toThrow(/alice's private table/);
		expect(takeStake).not.toHaveBeenCalled();

		await placeBets(client(), ALICE, ROUND, [{ kind: "red" }], NOW);
		expect(takeStake).toHaveBeenCalled();
	});

	it("refuses a table that has closed or been spun", async () => {
		repository.findRound.mockResolvedValue(record({ closesAt: new Date(NOW - 1) }));
		await expect(placeBets(client(), ALICE, ROUND, [{ kind: "red" }], NOW)).rejects.toThrow(/closed/);

		repository.findRound.mockResolvedValue(record({ status: "spinning" }));
		await expect(placeBets(client(), ALICE, ROUND, [{ kind: "red" }], NOW)).rejects.toThrow(/closed/);
		expect(takeStake).not.toHaveBeenCalled();
	});
});

describe("the chip and clearing", () => {
	it("sets a player's chip from an amount, half or all", async () => {
		repository.findRound.mockResolvedValue(record());
		repository.setSeatChip.mockResolvedValue(record());

		expect(await changeChip(ALICE, ROUND, "half", NOW)).toEqual({ chip: 500, wallet: 1_000 });
		expect(repository.setSeatChip).toHaveBeenCalledWith(ROUND, { userId: ALICE.userId, name: "alice" }, 500, NOW);
	});

	it("refuses a chip bigger than the wallet, saying what the wallet holds", async () => {
		repository.findRound.mockResolvedValue(record());

		await expect(changeChip(ALICE, ROUND, "5000", NOW)).rejects.toThrow(/wallet holds \*\*1,000\*\*/);
		expect(repository.setSeatChip).not.toHaveBeenCalled();
	});

	it("refuses a chip outside the server's bet limits", async () => {
		repository.findRound.mockResolvedValue(record());
		requireAccount.mockResolvedValueOnce({ wallet: 10_000 });

		await expect(changeChip(ALICE, ROUND, "5000", NOW)).rejects.toThrow(/2,000/);
		expect(repository.setSeatChip).not.toHaveBeenCalled();
	});

	it("hands back exactly the chips it took off the table", async () => {
		repository.clearBets.mockResolvedValue(
			record({
				players: {
					[ALICE.userId]: {
						name: "alice",
						joinedAt: 1,
						bets: [
							{ spot: "red", amount: 100 },
							{ spot: "n3", amount: 250 },
						],
					},
				},
			}),
		);
		repository.findRound.mockResolvedValue(record());

		expect((await clearMyBets(ALICE, ROUND)).refunded).toBe(350);
		expect(payOut).toHaveBeenCalledWith(ALICE, 350);
	});
});

describe("the spin", () => {
	const bets = {
		[ALICE.userId]: {
			name: "alice",
			joinedAt: 1,
			bets: [
				{ spot: "n0", amount: 100 },
				{ spot: "red", amount: 100 },
			],
		},
		"333333333333333333": { name: "bob", joinedAt: 2, bets: [{ spot: "black", amount: 50 }] },
	};

	it("pays every player from one pocket, shows the spin, then the result", async () => {
		repository.claimRound.mockResolvedValue(record({ status: "spinning", pocket: 0, players: bets }));
		const edit = jest.fn(() => Promise.resolve());
		const bot = client(edit);

		await spinRound(bot, ROUND, () => 0);

		// Zero: alice's chip on 0 pays 36 times, every outside bet loses.
		expect(payOut).toHaveBeenCalledWith({ guildId: ALICE.guildId, userId: ALICE.userId }, 3_600);
		expect(payOut).toHaveBeenCalledWith({ guildId: ALICE.guildId, userId: "333333333333333333" }, 0);
		expect(repository.finishRound).toHaveBeenCalledWith(ROUND, true);
		expect(edit).toHaveBeenCalledTimes(1);
		expect(bot.timers.after).toHaveBeenCalledWith(`roulette-reveal-${ROUND}`, expect.any(Number), expect.any(Function));
	});

	/** Each player's round counts once toward the casino's stats, with everything they staked and got back. */
	it("records each player's round for the stats once everybody is paid", async () => {
		repository.claimRound.mockResolvedValue(record({ status: "spinning", pocket: 0, players: bets }));

		await spinRound(client(), ROUND, () => 0);

		expect(recordCasinoPlays).toHaveBeenCalledWith([
			{ guildId: ALICE.guildId, userId: ALICE.userId, game: "roulette", staked: 200, returned: 3_600 },
			{ guildId: ALICE.guildId, userId: "333333333333333333", game: "roulette", staked: 50, returned: 0 },
		]);
	});

	/** The result shows this spin first, then the ones before it at this table. */
	it("puts this spin at the front of the table's last spins once the result shows", async () => {
		repository.claimRound.mockResolvedValue(record({ status: "spinning", pocket: 0, players: bets }));
		repository.recentPockets.mockResolvedValue([3, 26]);
		const edit = jest.fn((_id: string, _message: unknown) => Promise.resolve());
		const bot = client(edit);

		await spinRound(bot, ROUND, () => 0);
		expect(repository.recentPockets).toHaveBeenCalledWith(ALICE.guildId, "444444444444444444", ROULETTE_ROUND.history);
		expect(textOf(edit.mock.calls[0]![1] as never)).toContain("🔴 **3** · ⚫ **26**");

		const reveal = jest.mocked(bot.timers.after).mock.calls[0]![2];
		await reveal();
		expect(textOf(edit.mock.calls[1]![1] as never)).toContain("🟢 **0** · 🔴 **3** · ⚫ **26**");
	});

	/** A table nobody bet on did not really spin, so it must not appear among the last spins. */
	it("settles a table nobody bet on as unspun, and records nothing", async () => {
		repository.claimRound.mockResolvedValue(record({ status: "spinning", pocket: 7 }));

		await spinRound(client(), ROUND, () => 0);

		expect(repository.finishRound).toHaveBeenCalledWith(ROUND, false);
		expect(recordCasinoPlays).toHaveBeenCalledWith([]);
	});

	/** The claim is the guard: a timer and the sweep arriving together must not both pay. */
	it("pays nothing when the round was already spun", async () => {
		repository.claimRound.mockResolvedValue(null);

		expect(await spinRound(client(), ROUND, () => 0)).toBeNull();
		expect(payOut).not.toHaveBeenCalled();
	});

	/** Spin now skips the countdown, so its timer has to go, or it would fire into a round already paid. */
	it("lets a private table's host spin early, and stops the countdown", async () => {
		repository.findRound.mockResolvedValue(record({ private: true, players: bets }));
		repository.claimRound.mockResolvedValue(record({ status: "spinning", pocket: 0, private: true, players: bets }));
		const bot = client();

		await spinNow(bot, ALICE, ROUND, () => 0);

		expect(bot.timers.stop).toHaveBeenCalledWith(`roulette-${ROUND}`);
		expect(repository.claimRound).toHaveBeenCalledWith(ROUND, 0);
	});

	it("refuses to spin early for anybody but the host, at a public table, or with nothing bet", async () => {
		repository.findRound.mockResolvedValue(record({ private: true, players: bets }));
		await expect(spinNow(client(), { ...ALICE, userId: "333333333333333333" }, ROUND)).rejects.toThrow(
			/whoever opened/,
		);

		repository.findRound.mockResolvedValue(record({ players: bets }));
		await expect(spinNow(client(), ALICE, ROUND)).rejects.toThrow(/private table/);

		repository.findRound.mockResolvedValue(record({ private: true }));
		await expect(spinNow(client(), ALICE, ROUND)).rejects.toThrow(/chip down first/);

		expect(repository.claimRound).not.toHaveBeenCalled();
	});

	it("spins every round a restart left open past its close", async () => {
		repository.overdueRounds.mockResolvedValue([record({ closesAt: new Date(NOW - 60_000) })]);
		repository.claimRound.mockResolvedValue(record({ status: "spinning", pocket: 5, players: bets }));

		await spinOverdueRounds(client(), NOW);

		expect(repository.overdueRounds).toHaveBeenCalledWith(new Date(NOW - ROULETTE_ROUND.overdueMs), 10);
		expect(repository.claimRound).toHaveBeenCalledWith(ROUND, expect.any(Number));
	});
});
