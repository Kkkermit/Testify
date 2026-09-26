import { type MemberCounts } from "@testify/shared";

/** A whole-number percentage, so a server of bots and nobody else reads 0% rather than NaN. */
export function shareOf(part: number, whole: number): number {
	if (whole <= 0) return 0;

	return Math.round((part / whole) * 100);
}

/** The people and bots bar, as two percentages that always add up to 100 once there is anybody at all. */
export function splitOf(counts: Pick<MemberCounts, "people" | "bots">): { people: number; bots: number } {
	const whole = counts.people + counts.bots;
	const people = shareOf(counts.people, whole);

	return whole === 0 ? { people: 0, bots: 0 } : { people, bots: 100 - people };
}
