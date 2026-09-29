import { Types } from "mongoose";
import { UserFacingError } from "@core/errors";
import { advanceHand, claimHand, findHand, type HandRecord, openHand } from "@database/repositories/casinoRepository";
import { recordCasinoPlays } from "@database/repositories/casinoStatsRepository";
import { adjustWallet, debitWallet, incrementCounters, requireAccount } from "@database/repositories/economyRepository";
import { RANKS, SUITS } from "@lib/casino/cards.util";
import { type BlackjackState, type Card, type HiLoState, type Rank, type Roll } from "@lib/casino/casino.types";
import {
	callHiLo,
	cashOutHiLo,
	playBlackjack,
	settleAbandoned,
	startBlackjack,
	startHiLoHand,
} from "@lib/casino/casinoHands.util";
import { HILO_MAX_MULTIPLIER } from "@lib/casino/hilo.util";

jest.mock("@database/repositories/casinoRepository", () => ({
	openHand: jest.fn(),
	findHand: jest.fn(),
	advanceHand: jest.fn(),
	claimHand: jest.fn(),
	getCasinoSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/casinoStatsRepository", () => ({ recordCasinoPlays: jest.fn() }));
jest.mock("@database/repositories/economyRepository", () => ({
	requireAccount: jest.fn(),
	debitWallet: jest.fn(),
	adjustWallet: jest.fn(),
	incrementCounters: jest.fn(() => Promise.resolve()),
}));

const PLAYER = { guildId: "900000000000000001", userId: "100000000000000001" };
const card = (rank: Rank, suit: Card["suit"] = "spades"): Card => ({ rank, suit });

function held(game: HandRecord["game"], state: unknown, overrides: Partial<HandRecord> = {}): HandRecord {
	return {
		_id: new Types.ObjectId(),
		...PLAYER,
		game,
		bet: 100,
		staked: 100,
		state,
		version: 3,
		channelId: null,
		messageId: null,
		expiresAt: new Date(),
		...overrides,
	};
}

/** Deals from the top of a stacked deck: shuffledDeck pops from the end, so the script reverses the deal order. */
function blackjackState(player: Rank[], dealer: Rank[], deck: Rank[] = []): BlackjackState {
	return {
		player: player.map((rank) => card(rank)),
		dealer: dealer.map((rank) => card(rank)),
		deck: deck.map((rank) => card(rank)),
		doubled: false,
	};
}

let wallet: number;

beforeEach(() => {
	jest.clearAllMocks();
	wallet = 1_000;
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
	jest.mocked(findHand).mockResolvedValue(null);
	jest
		.mocked(openHand)
		.mockImplementation((hand) => Promise.resolve(held(hand.game, hand.state, { ...hand, version: 0 })));
	jest.mocked(advanceHand).mockResolvedValue(true);
	jest.mocked(claimHand).mockImplementation((hand) => Promise.resolve(hand as HandRecord));
});

/** A shuffle that stacks the deck so these cards are dealt first, in order: player, dealer, player, dealer. */
function stacked(first: Card[]): Roll {
	const deck = SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`));
	let dealt = 0;

	return (max) => {
		const position = max - 1;
		const wanted = first[dealt];
		const pick = wanted === undefined ? position : deck.indexOf(`${wanted.rank}${wanted.suit}`);
		[deck[position], deck[pick]] = [deck[pick]!, deck[position]!];
		dealt += 1;
		return pick;
	};
}

describe("starting a hand", () => {
	/** Refusing after the debit would take a stake for a hand that never existed. */
	it("refuses a second hand before any money moves", async () => {
		jest.mocked(findHand).mockResolvedValue(held("blackjack", blackjackState(["9", "7"], ["9", "7"])));

		await expect(startBlackjack(PLAYER, "100")).rejects.toThrow(UserFacingError);
		expect(debitWallet).not.toHaveBeenCalled();
	});

	/** Two starts at once both pass the check; the unique index lets one through, and the other gets its money back. */
	it("refunds the stake when a racing start won the table", async () => {
		jest.mocked(openHand).mockResolvedValue(null);

		await expect(startHiLoHand(PLAYER, "100")).rejects.toThrow(UserFacingError);
		expect(wallet).toBe(1_000);
	});

	it("takes the stake and leaves the hand open", async () => {
		const { view, hand } = await startHiLoHand(PLAYER, "250");

		expect(wallet).toBe(750);
		expect(hand).not.toBeNull();
		expect(view).toMatchObject({ phase: "open", staked: 250 });
		expect(incrementCounters).toHaveBeenCalled();
	});

	it("settles the player's natural on the deal, paying 3 to 2", async () => {
		const { view, hand } = await startBlackjack(
			PLAYER,
			"100",
			stacked([card("A"), card("9", "hearts"), card("K"), card("7", "hearts")]),
		);

		expect(view).toMatchObject({ verdict: "blackjack", returned: 250 });
		expect(hand).toBeNull();
		expect(wallet).toBe(1_150);
		expect(recordCasinoPlays).toHaveBeenCalledWith([{ ...PLAYER, game: "blackjack", staked: 100, returned: 250 }]);
	});

	it("settles the dealer's natural on the deal, before the player can act", async () => {
		const { view, hand } = await startBlackjack(
			PLAYER,
			"100",
			stacked([card("9"), card("A", "hearts"), card("7"), card("Q", "hearts")]),
		);

		expect(view).toMatchObject({ verdict: "dealer-blackjack", returned: 0 });
		expect(hand).toBeNull();
		expect(wallet).toBe(900);
	});
});

describe("blackjack", () => {
	it("draws a card on a hit and keeps the hand open under 21", async () => {
		jest.mocked(findHand).mockResolvedValue(held("blackjack", blackjackState(["5", "6"], ["10", "7"], ["2"])));

		const view = await playBlackjack(PLAYER, "hit");

		expect(view.verdict).toBeNull();
		expect(view.state.player).toHaveLength(3);
		expect(advanceHand).toHaveBeenCalledWith(expect.objectContaining({ version: 3 }), expect.anything());
	});

	/** A second press of the same button arrives with the version the first already moved past. */
	it("refuses a press that lost the race to another", async () => {
		jest.mocked(findHand).mockResolvedValue(held("blackjack", blackjackState(["5", "6"], ["10", "7"], ["2"])));
		jest.mocked(advanceHand).mockResolvedValue(false);

		await expect(playBlackjack(PLAYER, "hit")).rejects.toThrow(/already moved on/);
	});

	it("pays a win on the stand", async () => {
		jest.mocked(findHand).mockResolvedValue(held("blackjack", blackjackState(["10", "9"], ["10", "7"])));

		const view = await playBlackjack(PLAYER, "stand");

		expect(view).toMatchObject({ verdict: "win", returned: 200 });
		expect(wallet).toBe(1_200);
	});

	it("takes a second stake to double, and pays on both", async () => {
		jest.mocked(findHand).mockResolvedValue(held("blackjack", blackjackState(["5", "6"], ["10", "7"], ["K"])));

		const view = await playBlackjack(PLAYER, "double");

		expect(view).toMatchObject({ verdict: "win", staked: 200, returned: 400 });
		expect(wallet).toBe(1_000 - 100 + 400);
		// The double down's second stake is part of what was wagered.
		expect(recordCasinoPlays).toHaveBeenCalledWith([{ ...PLAYER, game: "blackjack", staked: 200, returned: 400 }]);
	});

	it("refuses to double when the wallet cannot cover it", async () => {
		wallet = 50;
		jest.mocked(findHand).mockResolvedValue(held("blackjack", blackjackState(["5", "6"], ["10", "7"], ["K"])));

		await expect(playBlackjack(PLAYER, "double")).rejects.toThrow(/cannot cover/);
		expect(claimHand).not.toHaveBeenCalled();
	});

	/** The extra stake was taken before the race was lost, so it has to come back. */
	it("returns the doubling stake when another press already settled the hand", async () => {
		jest.mocked(findHand).mockResolvedValue(held("blackjack", blackjackState(["5", "6"], ["10", "7"], ["K"])));
		jest.mocked(claimHand).mockResolvedValue(null);

		await expect(playBlackjack(PLAYER, "double")).rejects.toThrow(UserFacingError);
		expect(wallet).toBe(1_000);
	});

	it("says so when there is no hand to play", async () => {
		await expect(playBlackjack(PLAYER, "hit")).rejects.toThrow(/already finished/);
	});
});

describe("hi-lo", () => {
	const hilo = (state: Partial<HiLoState> = {}): HiLoState => ({
		current: card("7"),
		history: [],
		multiplier: 1,
		rounds: 0,
		...state,
	});

	it("keeps the hand open on a right call", async () => {
		jest.mocked(findHand).mockResolvedValue(held("hilo", hilo()));

		const view = await callHiLo(PLAYER, "higher", (max) => (max === 13 ? 11 : 0));

		expect(view).toMatchObject({ phase: "open", lastCall: true });
		expect(advanceHand).toHaveBeenCalled();
		expect(adjustWallet).not.toHaveBeenCalled();
	});

	it("ends the hand and pays nothing on a wrong call", async () => {
		jest.mocked(findHand).mockResolvedValue(held("hilo", hilo()));

		const view = await callHiLo(PLAYER, "higher", () => 1);

		expect(view).toMatchObject({ phase: "lost", returned: 0 });
		expect(claimHand).toHaveBeenCalled();
		expect(recordCasinoPlays).toHaveBeenCalledWith([{ ...PLAYER, game: "hilo", staked: 100, returned: 0 }]);
		expect(adjustWallet).not.toHaveBeenCalled();
	});

	it("refuses a call that cannot win, without drawing", async () => {
		jest.mocked(findHand).mockResolvedValue(held("hilo", hilo({ current: card("A") })));

		await expect(callHiLo(PLAYER, "higher")).rejects.toThrow(/Nothing is higher/);
		expect(claimHand).not.toHaveBeenCalled();
	});

	it("cashes out the pot", async () => {
		jest.mocked(findHand).mockResolvedValue(held("hilo", hilo({ multiplier: 2.5, rounds: 2 })));

		const view = await cashOutHiLo(PLAYER);

		expect(view).toMatchObject({ phase: "cashed", returned: 250 });
		expect(wallet).toBe(1_250);
		expect(recordCasinoPlays).toHaveBeenCalledWith([{ ...PLAYER, game: "hilo", staked: 100, returned: 250 }]);
	});

	it("banks the pot once it reaches the cap", async () => {
		jest
			.mocked(findHand)
			.mockResolvedValue(held("hilo", hilo({ current: card("K"), multiplier: HILO_MAX_MULTIPLIER })));

		const view = await callHiLo(PLAYER, "higher", () => 0);

		expect(view.phase).toBe("cashed");
		expect(advanceHand).not.toHaveBeenCalled();
	});

	/** Two cash-out presses must not pay twice. */
	it("pays nothing when another press already took the pot", async () => {
		jest.mocked(findHand).mockResolvedValue(held("hilo", hilo({ multiplier: 2 })));
		jest.mocked(claimHand).mockResolvedValue(null);

		await expect(cashOutHiLo(PLAYER)).rejects.toThrow(UserFacingError);
		expect(adjustWallet).not.toHaveBeenCalled();
		// A press that lost the race played nothing, so it must not count twice.
		expect(recordCasinoPlays).not.toHaveBeenCalled();
	});
});

describe("a hand left alone", () => {
	it("stands a blackjack hand and pays it", async () => {
		const settled = await settleAbandoned(held("blackjack", blackjackState(["10", "9"], ["10", "7"])));

		expect(settled.game).toBe("blackjack");
		expect(settled.view).toMatchObject({ verdict: "win", auto: true });
		expect(wallet).toBe(1_200);
	});

	it("cashes out a hi-lo pot", async () => {
		const settled = await settleAbandoned(
			held("hilo", { current: card("4"), history: [], multiplier: 1.5, rounds: 1 }),
		);

		expect(settled).toMatchObject({ game: "hilo", view: { phase: "cashed", returned: 150, auto: true } });
	});
});
