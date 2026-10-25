import { randomInt } from "node:crypto";
import { type PocketColour, type RouletteBet, type RouletteBetKind, type Roll } from "@lib/casino/casino.types";

/** A single-zero European wheel, pockets in the order they sit clockwise from zero. */
export const WHEEL_ORDER = [
	0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
	28, 12, 35, 3, 26,
] as const;

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const ROULETTE_BETS: readonly RouletteBetKind[] = [
	"red",
	"black",
	"odd",
	"even",
	"low",
	"high",
	"dozen1",
	"dozen2",
	"dozen3",
	"column1",
	"column2",
	"column3",
	"number",
];

export function pocketColour(pocket: number): PocketColour {
	if (pocket === 0) return "green";

	return RED.has(pocket) ? "red" : "black";
}

/** Zero loses every outside bet, which is the whole of the house's edge. */
export function betWins(bet: RouletteBet, pocket: number): boolean {
	if (bet.kind === "number") return bet.number === pocket;
	if (pocket === 0) return false;

	switch (bet.kind) {
		case "red":
			return RED.has(pocket);
		case "black":
			return !RED.has(pocket);
		case "odd":
			return pocket % 2 === 1;
		case "even":
			return pocket % 2 === 0;
		case "low":
			return pocket <= 18;
		case "high":
			return pocket >= 19;
		case "dozen1":
			return pocket <= 12;
		case "dozen2":
			return pocket >= 13 && pocket <= 24;
		case "dozen3":
			return pocket >= 25;
		case "column1":
			return pocket % 3 === 1;
		case "column2":
			return pocket % 3 === 2;
		case "column3":
			return pocket % 3 === 0;
	}
}

/** What a winning bet hands back, stake included: 35 to 1, 2 to 1 or evens. */
export function rouletteReturn(kind: RouletteBetKind): number {
	if (kind === "number") return 36;
	if (kind.startsWith("dozen") || kind.startsWith("column")) return 3;

	return 2;
}

export function spinRoulette(roll: Roll = randomInt): number {
	return WHEEL_ORDER[roll(WHEEL_ORDER.length)]!;
}

/** Every spot a chip can sit on: the 37 numbers, then the outside bets in `ROULETTE_BETS` order. */
export const ROULETTE_SPOTS: readonly RouletteBet[] = [
	...Array.from({ length: 37 }, (_, number): RouletteBet => ({ kind: "number", number })),
	...ROULETTE_BETS.filter((kind) => kind !== "number").map((kind): RouletteBet => ({ kind })),
];

/** How a bet is stored and carried in a custom ID: `n17`, or the outside bet's own name. */
export function spotKey(bet: RouletteBet): string {
	return bet.kind === "number" ? `n${String(bet.number ?? 0)}` : bet.kind;
}

export function spotFromKey(key: string): RouletteBet | null {
	return ROULETTE_SPOTS.find((spot) => spotKey(spot) === key) ?? null;
}
