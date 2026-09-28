import { randomInt } from "node:crypto";
import { type Reels, type Roll, type SlotSymbol } from "@lib/casino/casino.types";

/** How often each symbol lands on a reel; every reel is the same strip. */
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = {
	cherry: 7,
	lemon: 6,
	bell: 5,
	bar: 4,
	star: 3,
	seven: 2,
	diamond: 1,
};

export const SLOT_SYMBOLS = Object.keys(SLOT_WEIGHTS) as SlotSymbol[];

/** Three of a kind, as a multiple of the stake, stake included. */
export const SLOT_PAYTABLE: Record<SlotSymbol, number> = {
	diamond: 500,
	seven: 120,
	star: 60,
	bar: 30,
	bell: 15,
	lemon: 10,
	cherry: 8,
};

/** Exactly two cherries anywhere on the line. */
export const TWO_CHERRIES = 3;

const STRIP_LENGTH = SLOT_SYMBOLS.reduce((total, symbol) => total + SLOT_WEIGHTS[symbol], 0);

function landOn(position: number): SlotSymbol {
	let remaining = position;
	for (const symbol of SLOT_SYMBOLS) {
		remaining -= SLOT_WEIGHTS[symbol];
		if (remaining < 0) return symbol;
	}

	throw new Error(`No slot symbol at position ${position}`);
}

export function spinSlots(roll: Roll = randomInt): Reels {
	return [landOn(roll(STRIP_LENGTH)), landOn(roll(STRIP_LENGTH)), landOn(roll(STRIP_LENGTH))];
}

/** What the line pays as a multiple of the stake, or zero. */
export function slotsReturn(reels: Reels): number {
	const [first, second, third] = reels;
	if (first === second && second === third) return SLOT_PAYTABLE[first];

	return reels.filter((symbol) => symbol === "cherry").length === 2 ? TWO_CHERRIES : 0;
}

/** The machine's exact long-run return, worked out over every line it can show. */
export function slotsReturnToPlayer(): number {
	let total = 0;

	for (const first of SLOT_SYMBOLS) {
		for (const second of SLOT_SYMBOLS) {
			for (const third of SLOT_SYMBOLS) {
				const chance = (SLOT_WEIGHTS[first] * SLOT_WEIGHTS[second] * SLOT_WEIGHTS[third]) / STRIP_LENGTH ** 3;
				total += chance * slotsReturn([first, second, third]);
			}
		}
	}

	return total;
}
