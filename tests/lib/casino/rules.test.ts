import {
	applyBlackjack,
	blackjackReturn,
	canDouble,
	finishBlackjack,
	handValue,
	openingVerdict,
} from "@lib/casino/blackjack.util";
import { cardLabel, randomCard, shuffledDeck } from "@lib/casino/cards.util";
import { type BlackjackState, type Card, type Rank, type Reels, type Roll } from "@lib/casino/casino.types";
import { COINFLIP_RETURN, DICE_RETURNS, diceWins, flipCoin, rollDice } from "@lib/casino/chance.util";
import { guessHiLo, HILO_MAX_MULTIPLIER, hiloChance, hiloPayout, hiloStep, startHiLo } from "@lib/casino/hilo.util";
import {
	betWins,
	pocketColour,
	ROULETTE_BETS,
	rouletteReturn,
	spinRoulette,
	WHEEL_ORDER,
} from "@lib/casino/roulette.util";
import { SLOT_PAYTABLE, slotsReturn, slotsReturnToPlayer, spinSlots, TWO_CHERRIES } from "@lib/casino/slots.util";

/** A roll that answers with these values in turn, so a test decides every card and pocket. */
function scripted(...values: number[]): Roll {
	let index = 0;
	return () => values[index++] ?? 0;
}

const card = (rank: Rank, suit: Card["suit"] = "spades"): Card => ({ rank, suit });

function hand(player: Rank[], dealer: Rank[], deck: Rank[] = []): BlackjackState {
	return {
		player: player.map((rank) => card(rank)),
		dealer: dealer.map((rank) => card(rank)),
		deck: deck.map((rank) => card(rank)),
		doubled: false,
	};
}

describe("roulette", () => {
	it("has every pocket from 0 to 36 exactly once", () => {
		expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, index) => index));
	});

	it("colours zero green and splits the rest eighteen and eighteen", () => {
		const colours = WHEEL_ORDER.map(pocketColour);

		expect(colours.filter((colour) => colour === "green")).toHaveLength(1);
		expect(colours.filter((colour) => colour === "red")).toHaveLength(18);
		expect(pocketColour(32)).toBe("red");
		expect(pocketColour(15)).toBe("black");
	});

	/** Zero is the house's edge; an outside bet that won on it would make the game a free lottery. */
	it("loses every outside bet on zero", () => {
		for (const kind of ROULETTE_BETS.filter((bet) => bet !== "number")) expect(betWins({ kind }, 0)).toBe(false);
		expect(betWins({ kind: "number", number: 0 }, 0)).toBe(true);
	});

	it("settles each outside bet on the pocket it covers", () => {
		expect(betWins({ kind: "red" }, 1)).toBe(true);
		expect(betWins({ kind: "black" }, 2)).toBe(true);
		expect(betWins({ kind: "odd" }, 35)).toBe(true);
		expect(betWins({ kind: "even" }, 35)).toBe(false);
		expect(betWins({ kind: "low" }, 18)).toBe(true);
		expect(betWins({ kind: "high" }, 19)).toBe(true);
		expect(betWins({ kind: "dozen2" }, 13)).toBe(true);
		expect(betWins({ kind: "dozen3" }, 24)).toBe(false);
		expect(betWins({ kind: "column1" }, 34)).toBe(true);
		expect(betWins({ kind: "column3" }, 36)).toBe(true);
	});

	it("pays 35 to 1, 2 to 1 and evens", () => {
		expect(rouletteReturn("number")).toBe(36);
		expect(rouletteReturn("dozen1")).toBe(3);
		expect(rouletteReturn("column2")).toBe(3);
		expect(rouletteReturn("red")).toBe(2);
	});

	/** Every bet on a single-zero wheel returns 36/37 of what is staked; a wrong multiplier breaks that. */
	it("keeps the house edge at 2.7% on every bet", () => {
		for (const kind of ROULETTE_BETS) {
			const bet = kind === "number" ? { kind, number: 17 } : { kind };
			const winning = WHEEL_ORDER.filter((pocket) => betWins(bet, pocket)).length;

			expect((winning * rouletteReturn(kind)) / 37).toBeCloseTo(36 / 37, 10);
		}
	});

	it("lands on the wheel pocket the roll picks", () => {
		expect(spinRoulette(scripted(1))).toBe(32);
	});
});

describe("slots", () => {
	it("pays the table for three of a kind and nothing for a mixed line", () => {
		expect(slotsReturn(["diamond", "diamond", "diamond"])).toBe(SLOT_PAYTABLE.diamond);
		expect(slotsReturn(["seven", "bell", "star"])).toBe(0);
	});

	it("pays two cherries anywhere on the line, but not one", () => {
		expect(slotsReturn(["cherry", "bar", "cherry"])).toBe(TWO_CHERRIES);
		expect(slotsReturn(["bar", "cherry", "lemon"])).toBe(0);
	});

	/** A machine that pays out more than it takes is an infinite-money button for the whole server. */
	it("returns a little under what it takes over the long run", () => {
		const rtp = slotsReturnToPlayer();

		expect(rtp).toBeGreaterThan(0.94);
		expect(rtp).toBeLessThan(0.97);
	});

	it("reads each reel off the weighted strip", () => {
		expect(spinSlots(scripted(0, 27, 7))).toEqual<Reels>(["cherry", "diamond", "lemon"]);
	});
});

describe("coinflip and dice", () => {
	it("calls the coin from the roll", () => {
		expect(flipCoin(scripted(0))).toBe("heads");
		expect(flipCoin(scripted(1))).toBe("tails");
		expect(COINFLIP_RETURN).toBeLessThan(2);
	});

	it("reads two dice from one to six", () => {
		expect(rollDice(scripted(0, 5))).toEqual([1, 6]);
	});

	it("settles under, over and seven", () => {
		expect(diceWins("under", [3, 3])).toBe(true);
		expect(diceWins("under", [3, 4])).toBe(false);
		expect(diceWins("seven", [3, 4])).toBe(true);
		expect(diceWins("over", [4, 4])).toBe(true);
		expect(DICE_RETURNS.seven).toBe(5);
	});
});

describe("cards", () => {
	it("shuffles a full deck of 52 distinct cards", () => {
		const deck = shuffledDeck();

		expect(new Set(deck.map(cardLabel)).size).toBe(52);
	});

	it("labels a card with its suit", () => {
		expect(cardLabel(card("10", "hearts"))).toBe("10♥");
		expect(randomCard(scripted(12, 3))).toEqual(card("K", "clubs"));
	});
});

describe("blackjack", () => {
	it("counts an ace as eleven until that would bust", () => {
		expect(handValue([card("A"), card("K")])).toBe(21);
		expect(handValue([card("A"), card("9"), card("5")])).toBe(15);
		expect(handValue([card("A"), card("A"), card("9")])).toBe(21);
	});

	it("settles naturals before anybody acts", () => {
		expect(openingVerdict(hand(["A", "K"], ["9", "8"]))).toBe("blackjack");
		expect(openingVerdict(hand(["9", "8"], ["A", "Q"]))).toBe("dealer-blackjack");
		expect(openingVerdict(hand(["A", "J"], ["A", "Q"]))).toBe("push");
		expect(openingVerdict(hand(["9", "8"], ["9", "7"]))).toBeNull();
	});

	it("ends the player's turn on 21 or a bust", () => {
		expect(applyBlackjack(hand(["9", "2"], ["9", "7"], ["K"]), "hit").done).toBe(true);
		expect(applyBlackjack(hand(["9", "2"], ["9", "7"], ["2"]), "hit").done).toBe(false);
	});

	it("doubles only on the first two cards, and draws exactly one", () => {
		const doubled = applyBlackjack(hand(["5", "6"], ["9", "7"], ["3", "K"]), "double");

		expect(doubled.done).toBe(true);
		expect(doubled.state.player).toHaveLength(3);
		expect(doubled.state.doubled).toBe(true);
		expect(canDouble(doubled.state)).toBe(false);
		expect(() => applyBlackjack(hand(["5", "2", "3"], ["9", "7"], ["3"]), "double")).toThrow();
	});

	it("does not change the state it was given", () => {
		const state = hand(["9", "2"], ["9", "7"], ["K"]);
		applyBlackjack(state, "hit");

		expect(state.player).toHaveLength(2);
		expect(state.deck).toHaveLength(1);
	});

	it("draws the dealer to seventeen and stands on a soft seventeen", () => {
		expect(finishBlackjack(hand(["10", "8"], ["10", "6"], ["2"])).state.dealer).toHaveLength(3);
		expect(finishBlackjack(hand(["10", "8"], ["A", "6"], ["5"])).state.dealer).toHaveLength(2);
	});

	it("settles a bust before the dealer draws", () => {
		expect(finishBlackjack(hand(["10", "8", "9"], ["10", "6"], ["2"]))).toMatchObject({ verdict: "bust" });
	});

	it("pays a dealer bust, and pushes a tie", () => {
		expect(finishBlackjack(hand(["10", "2"], ["10", "6"], ["K"])).verdict).toBe("win");
		expect(finishBlackjack(hand(["10", "8"], ["10", "8"])).verdict).toBe("push");
		expect(finishBlackjack(hand(["10", "7"], ["10", "8"])).verdict).toBe("lose");
	});

	it("pays a natural 3 to 2, a win evens and a push the stake back", () => {
		expect(blackjackReturn("blackjack", 100)).toBe(250);
		expect(blackjackReturn("win", 100)).toBe(200);
		expect(blackjackReturn("push", 100)).toBe(100);
		expect(blackjackReturn("dealer-blackjack", 100)).toBe(0);
		expect(blackjackReturn("bust", 100)).toBe(0);
	});
});

describe("hi-lo", () => {
	it("prices a call from the chance of the next card beating it", () => {
		expect(hiloChance(card("7"), "higher")).toBeCloseTo(7 / 13);
		expect(hiloChance(card("7"), "lower")).toBeCloseTo(5 / 13);
		expect(hiloStep(card("7"), "higher")).toBe(1.8);
	});

	/** An ace cannot be beaten and a two cannot be undercut; offering either call would sell a certain loss. */
	it("refuses a call that cannot win", () => {
		expect(hiloStep(card("A"), "higher")).toBeNull();
		expect(hiloStep(card("2"), "lower")).toBeNull();
		expect(() => guessHiLo(startHiLo(scripted(1, 0)), "lower", scripted(0, 0))).toThrow();
	});

	it("grows the pot on a correct call and empties it on a wrong one", () => {
		const start = { current: card("7"), history: [], multiplier: 1, rounds: 0 };

		const won = guessHiLo(start, "higher", scripted(11, 0));
		expect(won.won).toBe(true);
		expect(won.state).toMatchObject({ current: card("Q"), multiplier: 1.8, rounds: 1, history: [card("7")] });

		expect(guessHiLo(start, "higher", scripted(2, 0))).toMatchObject({ won: false, state: { multiplier: 0 } });
	});

	it("loses on a tie", () => {
		expect(guessHiLo({ current: card("7"), history: [], multiplier: 1, rounds: 0 }, "higher", scripted(6, 1)).won).toBe(
			false,
		);
	});

	it("caps the pot", () => {
		const state = { current: card("K"), history: [], multiplier: HILO_MAX_MULTIPLIER, rounds: 9 };

		expect(guessHiLo(state, "higher", scripted(0, 0)).state.multiplier).toBe(HILO_MAX_MULTIPLIER);
	});

	it("pays the stake times the pot, rounded down", () => {
		expect(hiloPayout({ current: card("2"), history: [], multiplier: 1.83, rounds: 1 }, 101)).toBe(184);
	});
});
