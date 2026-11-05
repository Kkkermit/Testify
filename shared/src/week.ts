import { type ScheduleRepeat } from "./scheduledMessages";

export const WEEK_LIMITS = {
	days: 7,
	/** A daily post is listed once per day, so a week holds at most this many of any one post. */
	perSchedule: 7,
} as const;

export type WeekEvent =
	| { kind: "scheduled"; at: string; id: string; channelId: string; message: string; repeat: ScheduleRepeat }
	| { kind: "lottery"; at: string; prizePool: number }
	| { kind: "giveaway"; at: string; messageId: string; channelId: string; prize: string }
	/** At midnight UTC on the day, which is when the birthday job first looks. */
	| { kind: "birthday"; at: string; userId: string; name: string };

export type WeekEventKind = WeekEvent["kind"];

export interface GuildWeek {
	from: string;
	to: string;
	events: WeekEvent[];
}
