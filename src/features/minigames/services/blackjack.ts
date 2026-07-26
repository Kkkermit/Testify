import { randomInt } from "node:crypto";
import { type TestifyClient } from "../../../core/client";

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

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const STATE_KEY = "minigames:blackjack";

/**
 * Keyed by `guildId:userId`, not by user alone — the previous map allowed one
 * game per user across every server the bot was in.
 */
export function blackjackGames(client: TestifyClient): Map<string, BlackjackGame> {
	return client.featureState(STATE_KEY, () => new Map<string, BlackjackGame>());
}

export function gameKey(guildId: string, userId: string): string {
	return `${guildId}:${userId}`;
}

export function shuffledDeck(): Card[] {
	const deck: Card[] = [];
	for (const suit of SUITS) {
		for (const rank of RANKS) deck.push({ rank, suit });
	}

	for (let index = deck.length - 1; index > 0; index -= 1) {
		const swap = randomInt(index + 1);
		[deck[index], deck[swap]] = [deck[swap]!, deck[index]!];
	}

	return deck;
}

export function draw(deck: Card[]): Card {
	const card = deck.pop();
	if (!card) throw new Error("Deck exhausted");
	return card;
}

/** Aces count as eleven until that would bust, then as one. */
export function handValue(hand: Card[]): number {
	let total = 0;
	let aces = 0;

	for (const card of hand) {
		if (card.rank === "A") {
			aces += 1;
			total += 11;
		} else if (card.rank === "K" || card.rank === "Q" || card.rank === "J" || card.rank === "10") {
			total += 10;
		} else {
			total += Number.parseInt(card.rank, 10);
		}
	}

	while (total > 21 && aces > 0) {
		total -= 10;
		aces -= 1;
	}

	return total;
}

export function renderHand(hand: Card[], hideSecond = false): string {
	return hand.map((card, index) => (hideSecond && index === 1 ? "`??`" : `\`${card.rank}${card.suit}\``)).join(" ");
}

export type Verdict = "player" | "dealer" | "push";

export function settle(player: Card[], dealer: Card[]): Verdict {
	const playerTotal = handValue(player);
	const dealerTotal = handValue(dealer);

	if (playerTotal > 21) return "dealer";
	if (dealerTotal > 21) return "player";
	if (playerTotal === dealerTotal) return "push";
	return playerTotal > dealerTotal ? "player" : "dealer";
}

/** Dealer draws to 17 and stands on soft 17, matching the usual house rule. */
export function playDealer(deck: Card[], dealer: Card[]): void {
	while (handValue(dealer) < 17) dealer.push(draw(deck));
}
