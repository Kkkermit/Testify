import { randomInt } from "node:crypto";
import { type CoinSide, type DiceBet, type Roll } from "@lib/casino/casino.types";

/** The quick games: a coin, and two dice against seven. */

/** A called coin pays 0.95 to 1, which is the house's cut. */
export const COINFLIP_RETURN = 1.95;

/** Under or over seven pays evens and seven itself 4 to 1, as the carnival game does. */
export const DICE_RETURNS: Record<DiceBet, number> = { under: 2, seven: 5, over: 2 };

export const DICE_BET_LABELS: Record<DiceBet, string> = {
	under: "Under 7",
	seven: "Exactly 7",
	over: "Over 7",
};

export function flipCoin(roll: Roll = randomInt): CoinSide {
	return roll(2) === 0 ? "heads" : "tails";
}

export function rollDice(roll: Roll = randomInt): [number, number] {
	return [roll(6) + 1, roll(6) + 1];
}

export function diceWins(bet: DiceBet, dice: readonly [number, number]): boolean {
	const total = dice[0] + dice[1];
	if (bet === "under") return total < 7;
	if (bet === "over") return total > 7;

	return total === 7;
}
