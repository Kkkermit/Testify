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
import {
	type Notice,
	type NoticeFeed,
	noticeInput,
	type NoticeInput,
	NOTICE_LIMITS,
	noticePatch,
	type NoticePatch,
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

export async function postNotice(input: NoticeInput, authorId: string): Promise<Notice> {
	const notice = await createNotice(parsed(noticeInput.safeParse(input)), authorId);
	if (notice === null) {
		throw new UserFacingError(
			`There are already ${String(NOTICE_LIMITS.maxActive)} notifications up. Remove one before posting another.`,
		);
	}
	return notice;
}

export async function changeNotice(id: string, patch: NoticePatch): Promise<Notice> {
	const notice = await updateNotice(id, parsed(noticePatch.safeParse(patch)));
	if (notice === null) throw new UserFacingError("That notification has already been removed.");
	return notice;
}

export async function removeNotice(id: string): Promise<void> {
	if (!(await deleteNotice(id))) throw new UserFacingError("That notification has already been removed.");
}

/** Newest first, as every surface lists them. */
export async function allNotices(): Promise<Notice[]> {
	return listNotices();
}

export async function readNotice(id: string): Promise<Notice> {
	const notice = await findNotice(id);
	if (notice === null) throw new UserFacingError("That notification has already been removed.");
	return notice;
}

/** What somebody has to read, and how much of it is new to them; reading it here marks it read when asked to. */
export async function readNoticeFeed(userId: string, options: { markRead?: boolean } = {}): Promise<NoticeFeed> {
	const [notices, reader] = await Promise.all([listNotices(), readerState(userId)]);
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
	const notices = await listNotices();
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
