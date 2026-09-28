/** The types more than one module in the casino shares. */

/** Returns a whole number from 0 up to, but not including, `max`; `crypto.randomInt` in play, a fixed script in tests. */
export type Roll = (max: number) => number;

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
	rank: Rank;
	suit: Suit;
}

export type PocketColour = "red" | "black" | "green";

export type RouletteBetKind =
	| "red"
	| "black"
	| "odd"
	| "even"
	| "low"
	| "high"
	| "dozen1"
	| "dozen2"
	| "dozen3"
	| "column1"
	| "column2"
	| "column3"
	| "number";

export interface RouletteBet {
	kind: RouletteBetKind;
	/** Only for a single-number bet. */
	number?: number;
}

export type SlotSymbol = "cherry" | "lemon" | "bell" | "bar" | "star" | "seven" | "diamond";

export type Reels = [SlotSymbol, SlotSymbol, SlotSymbol];

export type CoinSide = "heads" | "tails";

export type DiceBet = "under" | "seven" | "over";

export interface BlackjackState {
	deck: Card[];
	player: Card[];
	dealer: Card[];
	doubled: boolean;
}

export type BlackjackAction = "hit" | "stand" | "double";

export type BlackjackVerdict = "blackjack" | "win" | "push" | "lose" | "bust" | "dealer-blackjack";

export type HiLoGuess = "higher" | "lower";

export interface HiLoState {
	current: Card;
	/** Every card shown before the current one, oldest first. */
	history: Card[];
	/** What the stake is worth now, as a multiple of it. */
	multiplier: number;
	rounds: number;
}

/** The two card games whose hands outlive a single message, and so are kept in the database. */
export type HeldGame = "blackjack" | "hilo";
