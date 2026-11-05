import { SCHEDULE_REPEATS, type ScheduledMessage, type ScheduleRepeat } from "@testify/shared";
import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";
import { dateAndTime } from "@/lib/datetime";

export const REPEAT_LABELS: Record<ScheduleRepeat, TranslationKey> = {
	once: "scheduled.once",
	daily: "scheduled.daily",
	weekly: "scheduled.weekly",
};

export const REPEAT_ORDER = SCHEDULE_REPEATS;

const two = (value: number): string => String(value).padStart(2, "0");

/** What a `datetime-local` input holds: the reader's own wall-clock time, to the minute. */
export function toLocalInput(at: Date | string): string {
	const date = typeof at === "string" ? new Date(at) : at;
	return `${String(date.getFullYear())}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

export function fromLocalInput(value: string): Date | null {
	if (value === "") return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function scheduleSummary(
	messages: readonly Pick<ScheduledMessage, "channelId" | "nextAt">[],
	channelName: (id: string) => string,
	t: TFunction,
): string {
	const next = [...messages].sort((a, b) => a.nextAt.localeCompare(b.nextAt))[0];
	if (next === undefined) return t("scheduled.summaryNone");

	return t("scheduled.summary", {
		count: messages.length,
		channel: channelName(next.channelId),
		when: dateAndTime(next.nextAt),
	});
}
