import { z } from "zod";
import { plainLine, plainText } from "./text";

/** Bot-wide notes from the bot's owners, read with `/bot-notifications` and on the dashboard. */

export const NOTICE_LIMITS = {
	maxTitle: 100,
	maxBody: 500,
	/** Every one is shown whole on one Discord panel, whose text is capped at 4,000 characters. */
	maxActive: 5,
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
	/** When it last counted as new, which an edit keeps unless everybody is told again. */
	publishedAt: string;
	updatedAt: string;
}

export interface NoticeFeed {
	notices: Notice[];
	/** How many were published since this reader last looked. */
	unread: number;
}

export const noticeInput = z.object({
	title: plainLine(1, NOTICE_LIMITS.maxTitle),
	body: plainText(1, NOTICE_LIMITS.maxBody),
	tone: z.enum(NOTICE_TONES),
});

export type NoticeInput = z.infer<typeof noticeInput>;

export const noticePatch = z
	.object({
		title: plainLine(1, NOTICE_LIMITS.maxTitle).optional(),
		body: plainText(1, NOTICE_LIMITS.maxBody).optional(),
		tone: z.enum(NOTICE_TONES).optional(),
		/** Counts it as new again, so everybody who read it is told once more. */
		notifyAgain: z.boolean().optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "change at least one thing");

export type NoticePatch = z.infer<typeof noticePatch>;

export const noticeParams = z.object({
	noticeId: z.string().regex(/^[a-f\d]{24}$/, "must be a notification id"),
});

/** Published after the reader last looked; a reader who never has counts every one. */
export function unreadNotices(notices: readonly Notice[], seenAt: string | null): number {
	return seenAt === null ? notices.length : notices.filter((notice) => notice.publishedAt > seenAt).length;
}
