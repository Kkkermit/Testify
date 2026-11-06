import { z } from "zod";
import { plainText } from "./text";

/** How far ahead a reminder may be set and how long it may be, for `/remind me` and the dashboard alike. */
export const REMINDER_RULES = {
	minMs: 60_000,
	maxMs: 365 * 86_400_000,
	maxText: 500,
} as const;

type ReminderTimeProblem = "tooSoon" | "tooLate";

export function reminderTimeProblem(dueAt: Date, now: Date = new Date()): ReminderTimeProblem | null {
	const delay = dueAt.getTime() - now.getTime();
	if (delay < REMINDER_RULES.minMs) return "tooSoon";
	if (delay > REMINDER_RULES.maxMs) return "tooLate";
	return null;
}

export const reminderEditBody = z.object({
	text: plainText(1, REMINDER_RULES.maxText),
	dueAt: z.iso.datetime({ offset: true }),
});

export type ReminderEdit = z.infer<typeof reminderEditBody>;
