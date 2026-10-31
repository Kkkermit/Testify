import { isScheduled, type Notice, noticeTimingBlocked, problem, type Problem } from "@testify/shared";
import { type TFunction } from "i18next";
import { fromLocalInput, toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";

const HOUR_MS = 60 * 60 * 1000;

/** How long one can be set to stay up, in hours; each fits inside `NOTICE_LIMITS.maxUpDays`. */
export const UP_FOR_HOURS = [1, 6, 12, 24, 72, 168, 336, 720] as const;

/** `keep` leaves an end that is already set where it is, and is only offered when there is one. */
export type UpFor = "keep" | "forever" | (typeof UP_FOR_HOURS)[number];

export interface TimingDraft {
	start: "now" | "later";
	/** The reader's own wall-clock time, as a `datetime-local` input holds it. */
	localTime: string;
	upFor: UpFor;
}

export function timingDraftOf(notice: Notice | null, now: Date): TimingDraft {
	if (notice === null)
		return { start: "now", localTime: toLocalInput(new Date(now.getTime() + HOUR_MS)), upFor: "forever" };

	const waiting = isScheduled(notice, now);
	return {
		start: waiting ? "later" : "now",
		localTime: waiting ? toLocalInput(notice.publishedAt) : "",
		upFor: notice.endsAt === null ? "forever" : "keep",
	};
}

export interface TimingChange {
	startsAt?: string;
	endsAt?: string | null;
}

/** What to send for the times, or the rule broken; one already up counts from now, as on Discord, and keeps its start. */
export function timingChange(
	draft: TimingDraft,
	notice: Notice | null,
	now: Date,
): { change: TimingChange; problem: Problem | null } {
	const waiting = notice === null ? draft.start === "later" : isScheduled(notice, now);
	const chosen = waiting ? fromLocalInput(draft.localTime) : null;
	const current = notice === null ? null : new Date(notice.publishedAt);
	const moved = waiting && chosen !== null && current?.getTime() !== chosen.getTime();
	const startsAt = chosen ?? current ?? now;

	const change: TimingChange = {};
	if (moved) change.startsAt = startsAt.toISOString();
	if (draft.upFor === "forever") {
		if (notice?.endsAt !== null) change.endsAt = null;
	} else if (draft.upFor !== "keep") {
		change.endsAt = new Date((waiting ? startsAt : now).getTime() + draft.upFor * HOUR_MS).toISOString();
	}

	const endsAt = change.endsAt === undefined ? (notice?.endsAt ?? null) : change.endsAt;
	const rescheduled = notice === null ? waiting : moved;
	const blocked =
		waiting && chosen === null
			? problem("notice.startPast")
			: rescheduled || change.endsAt !== undefined
				? noticeTimingBlocked({ startsAt, endsAt: endsAt === null ? null : new Date(endsAt), rescheduled }, now)
				: null;

	return { change, problem: blocked };
}

/** Hours under a day read as hours, and the rest as days. */
export function upForLabel(hours: (typeof UP_FOR_HOURS)[number], t: TFunction): string {
	return hours < 24 ? t("owner.noticeUpForHours", { count: hours }) : t("owner.noticeUpForDays", { count: hours / 24 });
}
