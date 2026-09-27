import { randomInt } from "node:crypto";
import { type Card, type Rank, type Roll, type Suit } from "@lib/casino/casino.types";

export const SUITS: readonly Suit[] = ["spades", "hearts", "diamonds", "clubs"];
export const RANKS: readonly Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const SUIT_GLYPHS: Record<Suit, string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };

export function isRed(card: Card): boolean {
	return card.suit === "hearts" || card.suit === "diamonds";
}

export function cardLabel(card: Card): string {
	return `${card.rank}${SUIT_GLYPHS[card.suit]}`;
}

export function handLabel(hand: readonly Card[]): string {
	return hand.map((card) => `\`${cardLabel(card)}\``).join(" ");
}

/** A Fisher–Yates shuffle of one 52-card deck, dealt from the end. */
export function shuffledDeck(roll: Roll = randomInt): Card[] {
	const deck = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));

	for (let index = deck.length - 1; index > 0; index -= 1) {
		const swap = roll(index + 1);
		[deck[index], deck[swap]] = [deck[swap]!, deck[index]!];
	}

	return deck;
}

export function draw(deck: Card[]): Card {
	const card = deck.pop();
	if (card === undefined) throw new Error("The deck ran out of cards");

	return card;
}

/** One card from an endless shoe, for a game that must not be countable. */
export function randomCard(roll: Roll = randomInt): Card {
	return { rank: RANKS[roll(RANKS.length)]!, suit: SUITS[roll(SUITS.length)]! };
}
