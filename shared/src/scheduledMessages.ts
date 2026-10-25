import { z } from "zod";
import { type Problem, problem } from "./problems";
import { snowflake } from "./schemas";
import { plainText } from "./text";

/** A message the bot posts at a set time, once or every day or week from then. It never pings anybody. */

export const SCHEDULE_LIMITS = {
	maxMessage: 2_000,
	maxPerGuild: 10,
	/** The first post is at least this far ahead, so a clock a little behind cannot refuse it as past. */
	minAheadMinutes: 1,
	maxAheadDays: 365,
	/** A post later than this is skipped rather than sent, so a stale announcement is never posted. */
	lateByMinutes: 60,
} as const;

/** Every 24 hours or 7 days from the first post, so no time zone is ever stored. */
export const SCHEDULE_REPEATS = ["once", "daily", "weekly"] as const;

export type ScheduleRepeat = (typeof SCHEDULE_REPEATS)[number];

export interface ScheduledMessage {
	id: string;
	channelId: string;
	message: string;
	repeat: ScheduleRepeat;
	/** ISO 8601, in UTC. */
	nextAt: string;
	/** False when the bot cannot post in the channel, so a message that will never arrive says so. */
	canSend: boolean;
}

export interface ScheduledMessageList {
	messages: ScheduledMessage[];
	limit: number;
}

export const scheduledMessageInput = z.object({
	channelId: snowflake,
	message: plainText(1, SCHEDULE_LIMITS.maxMessage),
	repeat: z.enum(SCHEDULE_REPEATS),
	nextAt: z.iso.datetime({ offset: true }),
});

export type ScheduledMessageInput = z.infer<typeof scheduledMessageInput>;

export const scheduledMessageParams = z.object({
	messageId: z.string().regex(/^[a-f\d]{24}$/, "must be a scheduled message id"),
});

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function scheduleContentBlocked(entry: { channelId: string | null; message: string }): Problem | null {
	if (entry.channelId === null) return problem("schedule.channel");
	if (entry.message.trim() === "") return problem("schedule.message");
	return null;
}

/** Checked only when the time changes, so the words of a post that is already due can still be edited. */
export function scheduleTimeBlocked(nextAt: Date | null, now: Date): Problem | null {
	if (nextAt === null || Number.isNaN(nextAt.getTime())) return problem("schedule.time");

	const ahead = nextAt.getTime() - now.getTime();
	if (ahead < SCHEDULE_LIMITS.minAheadMinutes * MINUTE) return problem("schedule.past");
	if (ahead > SCHEDULE_LIMITS.maxAheadDays * DAY)
		return problem("schedule.tooFar", { max: SCHEDULE_LIMITS.maxAheadDays });

	return null;
}

/** Why a new schedule cannot be saved, as the form and the bot both say it. */
export function scheduleBlocked(
	entry: { channelId: string | null; message: string; nextAt: Date | null },
	now: Date,
): Problem | null {
	return scheduleContentBlocked(entry) ?? scheduleTimeBlocked(entry.nextAt, now);
}
