import { randomInt } from "node:crypto";
import { draw, shuffledDeck } from "@lib/casino/cards.util";
import {
	type BlackjackAction,
	type BlackjackState,
	type BlackjackVerdict,
	type Card,
	type Roll,
} from "@lib/casino/casino.types";

/** Aces count as eleven until that would bust, then as one. */
export function handValue(hand: readonly Card[]): number {
	let total = 0;
	let aces = 0;

	for (const card of hand) {
		if (card.rank === "A") {
			aces += 1;
			total += 11;
		} else if (card.rank === "K" || card.rank === "Q" || card.rank === "J") {
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

export function isBlackjack(hand: readonly Card[]): boolean {
	return hand.length === 2 && handValue(hand) === 21;
}

/** Dealt the way a table deals: player, dealer, player, dealer. */
export function dealBlackjack(roll: Roll = randomInt): BlackjackState {
	const deck = shuffledDeck(roll);
	const player = [draw(deck)];
	const dealer = [draw(deck)];
	player.push(draw(deck));
	dealer.push(draw(deck));

	return { deck, player, dealer, doubled: false };
}

/** A natural on either side ends the hand before anybody acts, because the dealer checks for one first. */
export function openingVerdict(state: BlackjackState): BlackjackVerdict | null {
	const player = isBlackjack(state.player);
	const dealer = isBlackjack(state.dealer);

	if (player && dealer) return "push";
	if (player) return "blackjack";
	if (dealer) return "dealer-blackjack";

	return null;
}

export function canDouble(state: BlackjackState): boolean {
	return state.player.length === 2 && !state.doubled;
}

/** Plays one decision; `done` means the player has nothing left to choose and the dealer draws next. */
export function applyBlackjack(
	state: BlackjackState,
	action: BlackjackAction,
): { state: BlackjackState; done: boolean } {
	const next: BlackjackState = {
		deck: [...state.deck],
		player: [...state.player],
		dealer: [...state.dealer],
		doubled: state.doubled,
	};

	if (action === "stand") return { state: next, done: true };

	if (action === "double") {
		if (!canDouble(state)) throw new Error("A hand can only be doubled on its first two cards");
		next.player.push(draw(next.deck));
		next.doubled = true;
		return { state: next, done: true };
	}

	next.player.push(draw(next.deck));

	return { state: next, done: handValue(next.player) >= 21 };
}

/** The dealer draws to seventeen and stands on every seventeen, soft or hard. */
export function finishBlackjack(state: BlackjackState): { state: BlackjackState; verdict: BlackjackVerdict } {
	const next: BlackjackState = { ...state, deck: [...state.deck], dealer: [...state.dealer] };
	const player = handValue(next.player);

	if (player > 21) return { state: next, verdict: "bust" };

	while (handValue(next.dealer) < 17) next.dealer.push(draw(next.deck));

	const dealer = handValue(next.dealer);
	if (dealer > 21 || player > dealer) return { state: next, verdict: "win" };
	if (player === dealer) return { state: next, verdict: "push" };

	return { state: next, verdict: "lose" };
}

/** What comes back across the table for a stake, stake included: a natural pays 3 to 2. */
export function blackjackReturn(verdict: BlackjackVerdict, staked: number): number {
	if (verdict === "blackjack") return Math.floor(staked * 2.5);
	if (verdict === "win") return staked * 2;
	if (verdict === "push") return staked;

	return 0;
}
