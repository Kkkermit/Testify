import { randomInt } from "node:crypto";
import { randomCard } from "@lib/casino/cards.util";
import { type Card, type HiLoGuess, type HiLoState, type Roll } from "@lib/casino/casino.types";

/** Each correct call pays its fair odds less three per cent, and a tie loses. */
export const HILO_EDGE = 0.97;

/** Past this the pot stops growing, so one lucky run cannot empty a server's economy. */
export const HILO_MAX_MULTIPLIER = 1_000;

/** Aces are high: two is the lowest card and ace the highest. */
export function cardValue(card: Card): number {
	if (card.rank === "A") return 14;
	if (card.rank === "K") return 13;
	if (card.rank === "Q") return 12;
	if (card.rank === "J") return 11;

	return Number.parseInt(card.rank, 10);
}

/** The chance the next card from an endless shoe is strictly higher, or strictly lower. */
export function hiloChance(card: Card, guess: HiLoGuess): number {
	const value = cardValue(card);

	return guess === "higher" ? (14 - value) / 13 : (value - 2) / 13;
}

/** What a correct call multiplies the pot by, or null when the call cannot win. */
export function hiloStep(card: Card, guess: HiLoGuess): number | null {
	const chance = hiloChance(card, guess);
	if (chance === 0) return null;

	return Math.floor((HILO_EDGE / chance) * 100) / 100;
}

export function startHiLo(roll: Roll = randomInt): HiLoState {
	return { current: randomCard(roll), history: [], multiplier: 1, rounds: 0 };
}

export function guessHiLo(
	state: HiLoState,
	guess: HiLoGuess,
	roll: Roll = randomInt,
): { state: HiLoState; won: boolean } {
	const step = hiloStep(state.current, guess);
	if (step === null) throw new Error(`Guessing ${guess} on ${state.current.rank} can never win`);

	const next = randomCard(roll);
	const difference = cardValue(next) - cardValue(state.current);
	const won = guess === "higher" ? difference > 0 : difference < 0;

	return {
		won,
		state: {
			current: next,
			history: [...state.history, state.current],
			multiplier: won ? Math.min(HILO_MAX_MULTIPLIER, Math.floor(state.multiplier * step * 100) / 100) : 0,
			rounds: state.rounds + 1,
		},
	};
}

export function hiloPayout(state: HiLoState, stake: number): number {
	return Math.floor(stake * state.multiplier);
}
