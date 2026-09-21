import { type MemberDetail, type MemberWarning } from "@testify/shared";
import { type TFunction } from "i18next";
import { shortDate } from "@/lib/datetime";

export function describeJoined(joinedAt: string | null, t: TFunction): string {
	return joinedAt === null ? t("members.joinUnknown") : t("members.joined", { date: shortDate(joinedAt) });
}

/** A softban that has already lapsed is history, not a live restriction — the job just has not swept it yet. */
export function softbanActive(detail: MemberDetail, now = Date.now()): boolean {
	return detail.softban !== null && new Date(detail.softban.expiresAt).getTime() > now;
}

export function warningSummary(warnings: MemberWarning[], t: TFunction): string {
	if (warnings.length === 0) return t("members.noWarnings");

	return t("members.warningCount", { count: warnings.length });
}

/** Clearing wipes a record that cannot be recovered, so the confirmation asks for the name rather than a click. */
export function clearConfirmed(typed: string, detail: MemberDetail): boolean {
	return typed.trim().toLowerCase() === detail.username.trim().toLowerCase();
}

export function statsOf(detail: MemberDetail, t: TFunction): { label: string; value: string }[] {
	const rows: { label: string; value: string }[] = [];
	const rank = (value: number | null): string => (value === null ? t("members.unranked") : `#${String(value)}`);

	if (detail.economy !== null) {
		rows.push(
			{ label: t("members.wallet"), value: detail.economy.wallet.toLocaleString() },
			{ label: t("members.bank"), value: detail.economy.bank.toLocaleString() },
			{ label: t("members.moneyRank"), value: rank(detail.economy.rank) },
		);
	}
	if (detail.levels !== null) {
		rows.push(
			{ label: t("members.level"), value: detail.levels.level.toLocaleString() },
			{ label: t("members.xp"), value: detail.levels.xp.toLocaleString() },
			{ label: t("members.levelRank"), value: rank(detail.levels.rank) },
		);
	}

	return rows;
}
