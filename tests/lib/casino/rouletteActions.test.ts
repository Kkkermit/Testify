import { Types } from "mongoose";
import { type RoundRecord } from "@database/repositories/rouletteRepository";
import { ROULETTE_ROUND } from "@lib/casino/casino.constants";
import {
	changeChip,
	clearMyBets,
	openRound,
	placeBets,
	spinOverdueRounds,
	spinRound,
} from "@lib/casino/rouletteActions.util";
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
	overdueRounds: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@lib/casino/casinoActions.util", () => ({
	takeStake: jest.fn((_player: unknown, amount: string) => Promise.resolve({ bet: Number(amount), wallet: 0 })),
	payOut: jest.fn(() => Promise.resolve(0)),
}));
jest.mock("@database/repositories/economyRepository", () => ({
	requireAccount: jest.fn(() => Promise.resolve({ wallet: 1_000 })),
}));
jest.mock("@lib/canvas/rouletteWheel.util", () => ({
	rouletteSpin: jest.fn(() => ({ gif: Buffer.from("GIF"), durationMs: 3_000 })),
	rouletteStill: jest.fn(() => Buffer.from("PNG")),
}));

const repository = jest.requireMock("@database/repositories/rouletteRepository");
const { takeStake, payOut } = jest.requireMock("@lib/casino/casinoActions.util");

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

function client(edit = jest.fn(() => Promise.resolve())) {
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

		await openRound({ guildId: ALICE.guildId, channelId: "4", messageId: null }, ALICE.userId, 100, NOW);

		expect(repository.openRound).toHaveBeenCalledWith(expect.objectContaining({ closesAt: null }));
		expect(bot.timers.after).not.toHaveBeenCalled();
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

		expect(await changeChip(ALICE, ROUND, "half", NOW)).toBe(500);
		expect(repository.setSeatChip).toHaveBeenCalledWith(ROUND, { userId: ALICE.userId, name: "alice" }, 500, NOW);
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
		expect(repository.finishRound).toHaveBeenCalledWith(ROUND);
		expect(edit).toHaveBeenCalledTimes(1);
		expect(bot.timers.after).toHaveBeenCalledWith(`roulette-reveal-${ROUND}`, expect.any(Number), expect.any(Function));
	});

	/** The claim is the guard: a timer and the sweep arriving together must not both pay. */
	it("pays nothing when the round was already spun", async () => {
		repository.claimRound.mockResolvedValue(null);

		expect(await spinRound(client(), ROUND, () => 0)).toBeNull();
		expect(payOut).not.toHaveBeenCalled();
	});

	it("spins every round a restart left open past its close", async () => {
		repository.overdueRounds.mockResolvedValue([record({ closesAt: new Date(NOW - 60_000) })]);
		repository.claimRound.mockResolvedValue(record({ status: "spinning", pocket: 5, players: bets }));

		await spinOverdueRounds(client(), NOW);

		expect(repository.overdueRounds).toHaveBeenCalledWith(new Date(NOW - ROULETTE_ROUND.overdueMs), 10);
		expect(repository.claimRound).toHaveBeenCalledWith(ROUND, expect.any(Number));
	});
});
