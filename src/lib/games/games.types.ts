/** The types more than one module in this domain shares. */

export type Suit = "♠" | "♥" | "♦" | "♣";

export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
	rank: Rank;
	suit: Suit;
}

export interface BlackjackGame {
	guildId: string;
	userId: string;
	bet: number;
	deck: Card[];
	player: Card[];
	dealer: Card[];
	finished: boolean;
	startedAt: number;
}
