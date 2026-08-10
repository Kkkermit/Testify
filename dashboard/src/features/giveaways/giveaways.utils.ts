import { type GiveawayRow } from "@testify/shared";

export const DURATION_UNITS = [
	{ value: "minutes", label: "minutes", ms: 60_000 },
	{ value: "hours", label: "hours", ms: 3_600_000 },
	{ value: "days", label: "days", ms: 86_400_000 },
] as const;

export type DurationUnit = (typeof DURATION_UNITS)[number]["value"];

/** A number and a unit rather than a `3d` box: the shorthand is a second syntax to learn and to get wrong. */
export function durationMsOf(amount: number, unit: DurationUnit): number {
	const found = DURATION_UNITS.find((entry) => entry.value === unit);

	return found === undefined ? 0 : Math.round(amount * found.ms);
}

export type GiveawayStatus = "running" | "ended";

export function statusOf(row: GiveawayRow): GiveawayStatus {
	return row.ended ? "ended" : "running";
}

/**
 * Running first, then most recently started.
 *
 * The API already sorts by start time, but a finished giveaway from this morning is not what somebody opening
 * the screen came to act on, and the actions differ by status.
 */
export function ordered(rows: GiveawayRow[]): GiveawayRow[] {
	return [...rows].sort((a, b) => {
		if (a.ended !== b.ended) return a.ended ? 1 : -1;

		return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
	});
}

export function runningCount(rows: GiveawayRow[]): number {
	return rows.filter((row) => !row.ended).length;
}

/** Reroll only makes sense once it has drawn, and only when it actually drew somebody. */
export function canReroll(row: GiveawayRow): boolean {
	return row.ended && row.winners.length > 0;
}
