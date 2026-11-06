import { z } from "zod";
import { plainLine, plainText } from "./text";

/** One person's profile, the same in every server; `/profile set` and the dashboard both write it. */

export const PROFILE_LIMITS = {
	about: 500,
	favouriteSong: 100,
	favouriteGame: 100,
	hobbies: 200,
	/** A birthday before this year is not somebody using Discord. */
	earliestYear: 1900,
} as const;

export interface AccountProfile {
	about: string;
	favouriteSong: string;
	favouriteGame: string | null;
	hobbies: string | null;
	/** `YYYY-MM-DD`, or null when it is not shared. */
	birthday: string | null;
	updatedAt: string;
}

const optionalLine = (max: number) =>
	z
		.string()
		.nullable()
		.transform((value) => (value === null || value.trim() === "" ? null : value))
		.pipe(plainLine(1, max).nullable());

export const profileBody = z.object({
	about: plainText(1, PROFILE_LIMITS.about),
	favouriteSong: plainLine(1, PROFILE_LIMITS.favouriteSong),
	favouriteGame: optionalLine(PROFILE_LIMITS.favouriteGame),
	hobbies: optionalLine(PROFILE_LIMITS.hobbies),
	birthday: z.string().max(10).nullable(),
});

export type ProfileBody = z.infer<typeof profileBody>;

/** A real calendar date, no later than today and no earlier than 1900; `2026-02-30` is refused rather than rolled on. */
export function birthdayFrom(raw: string, now: Date = new Date()): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	if (match === null) return null;

	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const date = new Date(Date.UTC(year, month - 1, day));
	const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

	return real && year >= PROFILE_LIMITS.earliestYear && date.getTime() <= now.getTime() ? date : null;
}

export function birthdayText(date: Date | null): string | null {
	return date === null ? null : date.toISOString().slice(0, 10);
}
