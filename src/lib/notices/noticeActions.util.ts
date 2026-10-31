import { type Logger } from "pino";
import { toError, UserFacingError } from "@core/errors";
import {
	createNotice,
	deleteNotice,
	findNotice,
	listNotices,
	markNoticeHinted,
	markNoticesSeen,
	readerState,
	updateNotice,
} from "@database/repositories/noticeRepository";
import { problemText } from "@lib/format/problemText.util";
import {
	isScheduled,
	liveNotices,
	type Notice,
	type NoticeFeed,
	noticeInput,
	type NoticeInput,
	NOTICE_LIMITS,
	noticePatch,
	type NoticePatch,
	noticeTimingBlocked,
	unreadNotices,
} from "@testify/shared";

/** The one path a notification is posted, changed or read, whether from Discord or from the dashboard. */

function parsed<T>(
	result: { success: true; data: T } | { success: false; error: { issues: { message: string }[] } },
): T {
	if (result.success) return result.data;
	throw new UserFacingError(
		`That notification cannot be saved: ${result.error.issues[0]?.message ?? "it is not valid"}.`,
	);
}

function refuseTiming(timing: Parameters<typeof noticeTimingBlocked>[0], now: Date): void {
	const blocked = noticeTimingBlocked(timing, now);
	if (blocked !== null) throw new UserFacingError(problemText(blocked));
}

const dateOf = (iso: string | null | undefined): Date | null =>
	iso === null || iso === undefined ? null : new Date(iso);

export async function postNotice(input: NoticeInput, authorId: string, now = new Date()): Promise<Notice> {
	const valid = parsed(noticeInput.safeParse(input));
	refuseTiming(
		{
			startsAt: dateOf(valid.startsAt) ?? now,
			endsAt: dateOf(valid.endsAt),
			rescheduled: valid.startsAt !== undefined,
		},
		now,
	);

	const notice = await createNotice(valid, authorId);
	if (notice === null) {
		throw new UserFacingError(
			`There are already ${String(NOTICE_LIMITS.maxActive)} notifications up. Remove one before posting another.`,
		);
	}
	return notice;
}

export async function changeNotice(id: string, patch: NoticePatch, now = new Date()): Promise<Notice> {
	const valid = parsed(noticePatch.safeParse(patch));

	if (valid.startsAt !== undefined || valid.endsAt !== undefined) {
		const current = await readNotice(id);
		if (valid.startsAt !== undefined && !isScheduled(current, now)) {
			throw new UserFacingError("It is already up, so when it goes up cannot be moved. Remove it and post it again.");
		}
		refuseTiming(
			{
				startsAt: valid.notifyAgain === true ? now : (dateOf(valid.startsAt) ?? new Date(current.publishedAt)),
				endsAt: valid.endsAt === undefined ? dateOf(current.endsAt) : dateOf(valid.endsAt),
				rescheduled: valid.startsAt !== undefined && valid.notifyAgain !== true,
			},
			now,
		);
	}

	const notice = await updateNotice(id, valid);
	if (notice === null) throw new UserFacingError("That notification has already been removed.");
	return notice;
}

export async function removeNotice(id: string): Promise<void> {
	if (!(await deleteNotice(id))) throw new UserFacingError("That notification has already been removed.");
}

/** For the owners: newest first, the ones still waiting to go up included. */
export async function allNotices(now = new Date()): Promise<Notice[]> {
	return (await listNotices()).filter((notice) => notice.endsAt === null || Date.parse(notice.endsAt) > now.getTime());
}

export async function readNotice(id: string): Promise<Notice> {
	const notice = await findNotice(id);
	if (notice === null) throw new UserFacingError("That notification has already been removed.");
	return notice;
}

/** What somebody has to read, and how much of it is new to them; reading it here marks it read when asked to. */
export async function readNoticeFeed(userId: string, options: { markRead?: boolean } = {}): Promise<NoticeFeed> {
	const [all, reader] = await Promise.all([listNotices(), readerState(userId)]);
	const notices = liveNotices(all, new Date());
	if (options.markRead === true) {
		if (notices.length > 0) await markNoticesSeen(userId);
		return { notices, unread: 0 };
	}

	return { notices, unread: unreadNotices(notices, reader.seenAt?.toISOString() ?? null) };
}

/** People already told about the newest notification, so the read after each of their commands is skipped. */
const told = new Map<string, number>();
const TOLD_MAX = 10_000;

/**
 * Tells somebody who just ran a command how many notifications are new to them, once per notification; a `tell`
 * that fails is tried again on their next command.
 */
export async function mentionNewNotices(userId: string, tell: (unread: number) => Promise<unknown>): Promise<void> {
	const notices = liveNotices(await listNotices(), new Date());
	const newest = notices[0];
	if (newest === undefined) return;

	const latest = Date.parse(newest.publishedAt);
	if ((told.get(userId) ?? 0) >= latest) return;
	if (told.size >= TOLD_MAX) told.clear();
	told.set(userId, latest);

	const { seenAt, hintedAt } = await readerState(userId);
	if (Math.max(seenAt?.getTime() ?? 0, hintedAt?.getTime() ?? 0) >= latest) return;

	const unread = unreadNotices(notices, seenAt?.toISOString() ?? null);
	if (unread === 0) return;

	try {
		await tell(unread);
	} catch (error) {
		told.delete(userId);
		throw error;
	}
	await markNoticeHinted(userId, new Date(latest));
}

/** Run after a command has answered, never awaited by it; a hint that cannot be given waits for the next command. */
export function mentionNoticesAfterCommand(
	userId: string,
	logger: Logger,
	tell: (unread: number) => Promise<unknown>,
): void {
	void mentionNewNotices(userId, tell).catch((error: unknown) => {
		logger.debug({ err: toError(error), userId }, "[NOTICES] Could not mention new notifications after a command.");
	});
}

export function clearNoticeHints(): void {
	told.clear();
}
