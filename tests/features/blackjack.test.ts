import {
	type Card,
	draw,
	gameKey,
	handValue,
	playDealer,
	renderHand,
	settle,
	shuffledDeck,
} from "../../src/features/minigames/services/blackjack";

const card = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

describe("handValue", () => {
	it("counts pictures as ten", () => {
		expect(handValue([card("K"), card("7")])).toBe(17);
	});

	it("counts an ace as eleven when it fits", () => {
		expect(handValue([card("A"), card("9")])).toBe(20);
	});

	it("demotes an ace to one to avoid a bust", () => {
		expect(handValue([card("A"), card("9"), card("5")])).toBe(15);
	});

	it("demotes multiple aces independently", () => {
		expect(handValue([card("A"), card("A"), card("9")])).toBe(21);
	});
});

describe("settle", () => {
	it("gives the win to the higher hand", () => {
		expect(settle([card("K"), card("9")], [card("K"), card("7")])).toBe("player");
		expect(settle([card("K"), card("7")], [card("K"), card("9")])).toBe("dealer");
	});

	it("calls equal hands a push", () => {
		expect(settle([card("K"), card("8")], [card("Q"), card("8")])).toBe("push");
	});

	it("gives a bust to the other side", () => {
		expect(settle([card("K"), card("Q"), card("5")], [card("2"), card("3")])).toBe("dealer");
		expect(settle([card("2"), card("3")], [card("K"), card("Q"), card("5")])).toBe("player");
	});
});

describe("playDealer", () => {
	it("draws until seventeen", () => {
		const deck = shuffledDeck();
		const dealer = [card("2"), card("3")];

		playDealer(deck, dealer);
		expect(handValue(dealer)).toBeGreaterThanOrEqual(17);
	});

	it("stands on a made hand", () => {
		const deck = shuffledDeck();
		const dealer = [card("K"), card("8")];

		playDealer(deck, dealer);
		expect(dealer).toHaveLength(2);
	});
});

describe("deck", () => {
	it("holds a full 52 cards", () => {
		expect(shuffledDeck()).toHaveLength(52);
	});

	it("has no duplicates", () => {
		const deck = shuffledDeck();
		const seen = new Set(deck.map((entry) => `${entry.rank}${entry.suit}`));
		expect(seen.size).toBe(52);
	});

	it("shrinks as cards are drawn", () => {
		const deck = shuffledDeck();
		draw(deck);
		expect(deck).toHaveLength(51);
	});
});

describe("renderHand", () => {
	it("hides the dealer's second card when asked", () => {
		expect(renderHand([card("A"), card("K")], true)).toContain("??");
		expect(renderHand([card("A"), card("K")], false)).not.toContain("??");
	});
});

// One game per user *per guild* — the previous map was keyed by user alone, so a
// player could only have one hand across every server.
describe("gameKey", () => {
	it("scopes a game to a guild and a user", () => {
		expect(gameKey("guild-a", "user-1")).not.toBe(gameKey("guild-b", "user-1"));
	});
});
