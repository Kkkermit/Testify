import { z } from "zod";
import { snowflake } from "./schemas";
import { plainText } from "./text";

/** Birthdays a member chose to share with one server: the day and the month, never the year. */

export const BIRTHDAY_LIMITS = {
	maxMessage: 500,
	/** How many upcoming birthdays the dashboard and `/birthday list` show. */
	upcoming: 25,
} as const;

export const BIRTHDAY_PLACEHOLDERS = ["{user}", "{username}", "{server}"] as const;

export const DEFAULT_BIRTHDAY_MESSAGE = "Happy birthday, {user}! 🎂";

export const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

/** February counts 29, so a leap-day birthday can be shared and is posted on the 28th in other years. */
export function daysInMonth(month: number): number {
	return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

export function isBirthday(day: number, month: number): boolean {
	return Number.isInteger(day) && Number.isInteger(month) && day >= 1 && day <= daysInMonth(month);
}

export interface BirthdaySettings {
	enabled: boolean;
	channelId: string | null;
	message: string;
	/** False when the bot cannot post in the channel, so a birthday that will never be posted says so. */
	canSend: boolean;
}

export interface UpcomingBirthday {
	userId: string;
	name: string;
	day: number;
	month: number;
}

export interface BirthdayOverview extends BirthdaySettings {
	/** How many members have shared their birthday here. */
	shared: number;
	upcoming: UpcomingBirthday[];
}

export const birthdayPatch = z
	.object({
		enabled: z.boolean().optional(),
		channelId: snowflake.nullable().optional(),
		message: plainText(1, BIRTHDAY_LIMITS.maxMessage).optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type BirthdayPatch = z.infer<typeof birthdayPatch>;
