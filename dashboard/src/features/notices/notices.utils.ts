import { type NoticeTone } from "@testify/shared";
import { type BadgeTone } from "@/components/primitives/Badge";
import { type TranslationKey } from "@/i18n";

export const NOTICE_TONE_LABELS: Record<NoticeTone, TranslationKey> = {
	info: "notices.toneInfo",
	problem: "notices.toneProblem",
	fixed: "notices.toneFixed",
};

export const NOTICE_TONE_BADGES: Record<NoticeTone, BadgeTone> = {
	info: "muted",
	problem: "warning",
	fixed: "success",
};

/** The list is newest first and only what came after the last read is new, so the new ones are the first `unread`. */
export function newNoticeIds(notices: readonly { id: string }[], unread: number): Set<string> {
	return new Set(notices.slice(0, unread).map((notice) => notice.id));
}

/** An edit within this long of posting is the same moment, not an edit worth mentioning. */
const EDIT_GRACE_MS = 60_000;

export function wasEdited(notice: { publishedAt: string; updatedAt: string }): boolean {
	return Date.parse(notice.updatedAt) - Date.parse(notice.publishedAt) > EDIT_GRACE_MS;
}
