import { z } from "zod";
import { problem, type Problem } from "./problems";
import { plainLine, plainText } from "./text";

/** Bot-wide notes from the bot's owners, read with `/bot-notifications` and on the dashboard. */

export const NOTICE_LIMITS = {
	maxTitle: 100,
	maxBody: 500,
	/** Every one, up or waiting to go up, is shown whole on one Discord panel, whose text is capped at 4,000 characters. */
	maxActive: 5,
	/** A scheduled one goes up within this many days, and leaves at least this many minutes to say so. */
	maxAheadDays: 90,
	minAheadMinutes: 1,
	/** The longest one can be set to stay up before it takes itself down. */
	maxUpDays: 90,
	/** A reader record unused this long is dropped, and every notification then counts as new to them. */
	readerDays: 90,
} as const;

export const NOTICE_TONES = ["info", "problem", "fixed"] as const;

export type NoticeTone = (typeof NOTICE_TONES)[number];

export interface Notice {
	id: string;
	title: string;
	body: string;
	tone: NoticeTone;
	/** When it goes up, or last counted as new; later than now while it waits, which only the owners ever see. */
	publishedAt: string;
	/** When it takes itself down, or null to stay up until it is removed. */
	endsAt: string | null;
	updatedAt: string;
}

export interface NoticeFeed {
	notices: Notice[];
	/** How many were published since this reader last looked. */
	unread: number;
}

const when = z.iso.datetime({ offset: true });

export const noticeInput = z.object({
	title: plainLine(1, NOTICE_LIMITS.maxTitle),
	body: plainText(1, NOTICE_LIMITS.maxBody),
	tone: z.enum(NOTICE_TONES),
	/** Left out to post it now. */
	startsAt: when.optional(),
	endsAt: when.nullable().optional(),
});

export type NoticeInput = z.infer<typeof noticeInput>;

export const noticePatch = z
	.object({
		title: plainLine(1, NOTICE_LIMITS.maxTitle).optional(),
		body: plainText(1, NOTICE_LIMITS.maxBody).optional(),
		tone: z.enum(NOTICE_TONES).optional(),
		/** Only while it is still waiting to go up. */
		startsAt: when.optional(),
		/** Null keeps it up until it is removed. */
		endsAt: when.nullable().optional(),
		/** Counts it as new again, so everybody who read it is told once more; one still waiting goes up now. */
		notifyAgain: z.boolean().optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "change at least one thing");

export type NoticePatch = z.infer<typeof noticePatch>;

export const noticeParams = z.object({
	noticeId: z.string().regex(/^[a-f\d]{24}$/, "must be a notification id"),
});

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Up now: gone up and not yet taken down. */
export function isLive(notice: Pick<Notice, "publishedAt" | "endsAt">, now: Date): boolean {
	const at = now.getTime();
	return Date.parse(notice.publishedAt) <= at && (notice.endsAt === null || Date.parse(notice.endsAt) > at);
}

export function isScheduled(notice: Pick<Notice, "publishedAt">, now: Date): boolean {
	return Date.parse(notice.publishedAt) > now.getTime();
}

/** What readers are shown, in the order they are given. */
export function liveNotices<T extends Pick<Notice, "publishedAt" | "endsAt">>(notices: readonly T[], now: Date): T[] {
	return notices.filter((notice) => isLive(notice, now));
}

/** Why a notification's times cannot be saved; the start is judged against the clock only when it is being moved. */
export function noticeTimingBlocked(
	timing: { startsAt: Date; endsAt: Date | null; rescheduled: boolean },
	now: Date,
): Problem | null {
	const start = timing.startsAt.getTime();
	if (timing.rescheduled) {
		const ahead = start - now.getTime();
		if (Number.isNaN(ahead) || ahead < NOTICE_LIMITS.minAheadMinutes * MINUTE) return problem("notice.startPast");
		if (ahead > NOTICE_LIMITS.maxAheadDays * DAY)
			return problem("notice.startTooFar", { max: NOTICE_LIMITS.maxAheadDays });
	}

	if (timing.endsAt === null) return null;
	const end = timing.endsAt.getTime();
	if (Number.isNaN(end) || end <= Math.max(start, now.getTime())) return problem("notice.endBeforeStart");
	if (end - start > NOTICE_LIMITS.maxUpDays * DAY)
		return problem("notice.endTooLong", { max: NOTICE_LIMITS.maxUpDays });
	return null;
}

/** Published after the reader last looked; a reader who never has counts every one. */
export function unreadNotices(notices: readonly Notice[], seenAt: string | null): number {
	return seenAt === null ? notices.length : notices.filter((notice) => notice.publishedAt > seenAt).length;
}
