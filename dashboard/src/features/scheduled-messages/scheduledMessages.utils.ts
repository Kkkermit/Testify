import { SCHEDULE_REPEATS, type ScheduleRepeat } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

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

/** Null for an empty or unreadable value, which the shared rule then names. */
export function fromLocalInput(value: string): Date | null {
	if (value === "") return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}
