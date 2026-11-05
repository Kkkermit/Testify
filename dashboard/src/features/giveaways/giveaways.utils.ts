import { GIVEAWAY_POST, type GiveawayRow } from "@testify/shared";
import { type TranslationKey } from "@/i18n";
import { ahead } from "@/lib/datetime";

export const DURATION_UNITS = [
	{ value: "minutes", labelKey: "giveaways.unitMinutes", ms: 60_000 },
	{ value: "hours", labelKey: "giveaways.unitHours", ms: 3_600_000 },
	{ value: "days", labelKey: "giveaways.unitDays", ms: 86_400_000 },
] as const satisfies readonly { value: string; labelKey: TranslationKey; ms: number }[];

export type DurationUnit = (typeof DURATION_UNITS)[number]["value"];

export function durationMsOf(amount: number, unit: DurationUnit): number {
	const found = DURATION_UNITS.find((entry) => entry.value === unit);

	return found === undefined ? 0 : Math.round(amount * found.ms);
}

type GiveawayStatus = "running" | "ended";

export function statusOf(row: GiveawayRow): GiveawayStatus {
	return row.ended ? "ended" : "running";
}

export function ordered(rows: GiveawayRow[]): GiveawayRow[] {
	return [...rows].sort((a, b) => {
		if (a.ended !== b.ended) return a.ended ? 1 : -1;

		return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
	});
}

export function runningCount(rows: GiveawayRow[]): number {
	return rows.filter((row) => !row.ended).length;
}

export function canReroll(row: GiveawayRow): boolean {
	return row.ended && row.winners.length > 0;
}

export function nextDraw(rows: GiveawayRow[]): string | null {
	const ends = rows.filter((row) => !row.ended).map((row) => row.endAt);

	return ends.length === 0 ? null : ends.reduce((soonest, at) => (Date.parse(at) < Date.parse(soonest) ? at : soonest));
}

export interface GiveawayPost {
	content: string;
	lines: string[];
	footer: string;
}

export function giveawayPost(draft: { winnerCount: number; durationMs: number }, host: string | null): GiveawayPost {
	return {
		content: GIVEAWAY_POST.giveaway,
		lines: [
			GIVEAWAY_POST.inviteToParticipate,
			GIVEAWAY_POST.drawing.replace("{timestamp}", ahead(draft.durationMs)),
			...(host === null ? [] : [GIVEAWAY_POST.hostedBy.replace("{this.hostedBy}", `@${host}`)]),
		],
		footer: GIVEAWAY_POST.embedFooter.replace("{this.winnerCount}", String(draft.winnerCount)),
	};
}
