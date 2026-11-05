import { confirmsName, type MemberDetail, type MemberWarning } from "@testify/shared";
import { type TFunction } from "i18next";
import { dateAndTime, shortDate } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";

export function memberSummary(detail: MemberDetail, t: TFunction, now = Date.now()): string {
	if (softbanActive(detail, now) && detail.softban !== null) {
		return t("members.summarySoftbanned", { when: dateAndTime(detail.softban.expiresAt) });
	}
	if (!detail.inGuild) return t("members.summaryLeft");
	if (detail.timedOutUntil !== null && Date.parse(detail.timedOutUntil) > now) {
		return t("members.summaryTimedOut", { when: dateAndTime(detail.timedOutUntil) });
	}
	if (detail.joinedAt === null) return t("members.summaryHere");

	const date = shortDate(detail.joinedAt);
	const warned = detail.warnings?.length ?? 0;
	return warned === 0
		? t("members.summaryJoined", { date })
		: t("members.summaryJoinedWarned", { date, count: warned });
}

/** A lapsed softban the job has not swept yet is history, not a live restriction. */
export function softbanActive(detail: MemberDetail, now = Date.now()): boolean {
	return detail.softban !== null && new Date(detail.softban.expiresAt).getTime() > now;
}

export function warningSummary(warnings: MemberWarning[], t: TFunction): string {
	if (warnings.length === 0) return t("members.noWarnings");

	return t("members.warningCount", { count: warnings.length });
}

export function clearConfirmed(typed: string, detail: MemberDetail): boolean {
	return confirmsName(typed, detail.username, detail.userId);
}

export function canChangeWarnings(detail: MemberDetail): boolean {
	return detail.moderationProblem === null || !detail.inGuild;
}

export function statsOf(detail: MemberDetail, t: TFunction): { label: string; value: string }[] {
	const rows: { label: string; value: string }[] = [];
	const rank = (value: number | null): string => (value === null ? t("members.unranked") : `#${String(value)}`);

	if (detail.economy !== null) {
		rows.push(
			{ label: t("members.wallet"), value: formatNumber(detail.economy.wallet) },
			{ label: t("members.bank"), value: formatNumber(detail.economy.bank) },
			{ label: t("members.moneyRank"), value: rank(detail.economy.rank) },
		);
	}
	if (detail.levels !== null) {
		rows.push(
			{ label: t("members.level"), value: formatNumber(detail.levels.level) },
			{ label: t("members.xp"), value: formatNumber(detail.levels.xp) },
			{ label: t("members.levelRank"), value: rank(detail.levels.rank) },
		);
	}

	return rows;
}
