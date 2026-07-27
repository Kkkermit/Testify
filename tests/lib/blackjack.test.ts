import {
	blackjackGames,
	type Card,
	draw,
	gameKey,
	handValue,
	playDealer,
	type Rank,
	renderHand,
	settle,
	shuffledDeck,
} from "@lib/blackjack.util";

const card = (rank: Rank): Card => ({ rank, suit: "♠" });
const hand = (...ranks: Rank[]): Card[] => ranks.map(card);

describe("gameKey", () => {
	it("scopes a game to one player in one guild", () => {
		expect(gameKey("g1", "u1")).toBe("g1:u1");
		expect(gameKey("g1", "u1")).not.toBe(gameKey("g2", "u1"));
	});
});

describe("blackjackGames", () => {
	it("hands back the same map every time, so a game survives between interactions", () => {
		expect(blackjackGames()).toBe(blackjackGames());
	});
});

describe("shuffledDeck", () => {
	it("builds a full 52-card deck", () => {
		expect(shuffledDeck()).toHaveLength(52);
	});

	it("has no duplicate cards", () => {
		const deck = shuffledDeck();
		expect(new Set(deck.map((entry) => `${entry.rank}${entry.suit}`)).size).toBe(52);
	});

	it("does not deal in a fixed order", () => {
		const first = shuffledDeck().map((entry) => `${entry.rank}${entry.suit}`);
		const second = shuffledDeck().map((entry) => `${entry.rank}${entry.suit}`);
		expect(first).not.toEqual(second);
	});
});

describe("draw", () => {
	it("takes a card off the deck", () => {
		const deck = hand("A", "5");
		expect(draw(deck)).toEqual(card("5"));
		expect(deck).toHaveLength(1);
	});

	it("throws rather than returning undefined when the deck runs out", () => {
		expect(() => draw([])).toThrow(/exhausted/i);
	});
});

describe("handValue", () => {
	it("adds pip cards up", () => {
		expect(handValue(hand("2", "3", "4"))).toBe(9);
	});

	it("counts every face card as ten", () => {
		expect(handValue(hand("K", "Q"))).toBe(20);
		expect(handValue(hand("J", "10"))).toBe(20);
	});

	it("counts an ace as eleven while that fits", () => {
		expect(handValue(hand("A", "9"))).toBe(20);
	});

	it("drops an ace to one rather than busting", () => {
		expect(handValue(hand("A", "9", "5"))).toBe(15);
	});

	it("demotes only as many aces as it needs to", () => {
		expect(handValue(hand("A", "A", "9"))).toBe(21);
	});

	it("demotes every ace when it has to", () => {
		expect(handValue(hand("A", "A", "A", "K"))).toBe(13);
	});

	it("calls an empty hand zero", () => {
		expect(handValue([])).toBe(0);
	});
});

describe("renderHand", () => {
	it("shows every card by default", () => {
		expect(renderHand(hand("A", "K"))).toBe("`A♠` `K♠`");
	});

	it("hides the dealer's hole card while the hand is live", () => {
		expect(renderHand(hand("A", "K"), true)).toBe("`A♠` `??`");
	});

	it("hides nothing when there is no second card to hide", () => {
		expect(renderHand(hand("A"), true)).toBe("`A♠`");
	});
});

describe("settle", () => {
	it("gives it to the dealer when the player busts, even if the dealer busts too", () => {
		expect(settle(hand("K", "Q", "5"), hand("K", "Q", "5"))).toBe("dealer");
	});

	it("gives it to the player when only the dealer busts", () => {
		expect(settle(hand("K", "9"), hand("K", "Q", "5"))).toBe("player");
	});

	it("pushes on equal totals", () => {
		expect(settle(hand("K", "9"), hand("Q", "9"))).toBe("push");
	});

	it("gives it to the higher total", () => {
		expect(settle(hand("K", "9"), hand("Q", "8"))).toBe("player");
		expect(settle(hand("K", "7"), hand("Q", "8"))).toBe("dealer");
	});
});

describe("playDealer", () => {
	it("keeps drawing below seventeen", () => {
		const deck = hand("5", "5");
		playDealer(deck, hand("6", "5"));
		expect(deck.length).toBeLessThan(2);
	});

	it("stands on seventeen", () => {
		const deck = hand("5");
		const dealer = hand("K", "7");
		playDealer(deck, dealer);

		expect(dealer).toHaveLength(2);
		expect(deck).toHaveLength(1);
	});

	it("stands immediately on a hand already above seventeen", () => {
		const deck = hand("5");
		playDealer(deck, hand("K", "Q"));
		expect(deck).toHaveLength(1);
	});
});
