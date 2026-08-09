import { type MemberDetail, type MemberWarning } from "@testify/shared";
import { shortDate } from "@/lib/datetime";

export function describeJoined(joinedAt: string | null): string {
	return joinedAt === null ? "Join date unknown" : `Joined ${shortDate(joinedAt)}`;
}

/** A softban that has already lapsed is history, not a live restriction — the job just has not swept it yet. */
export function softbanActive(detail: MemberDetail, now = Date.now()): boolean {
	return detail.softban !== null && new Date(detail.softban.expiresAt).getTime() > now;
}

export function warningSummary(warnings: MemberWarning[]): string {
	if (warnings.length === 0) return "No warnings on record.";

	return `${String(warnings.length)} warning${warnings.length === 1 ? "" : "s"} on record.`;
}

/** Clearing wipes a record that cannot be recovered, so the confirmation asks for the name rather than a click. */
export function clearConfirmed(typed: string, detail: MemberDetail): boolean {
	return typed.trim().toLowerCase() === detail.username.trim().toLowerCase();
}

export function statsOf(detail: MemberDetail): { label: string; value: string }[] {
	const rows: { label: string; value: string }[] = [];

	if (detail.economy !== null) {
		rows.push(
			{ label: "Wallet", value: detail.economy.wallet.toLocaleString() },
			{ label: "Bank", value: detail.economy.bank.toLocaleString() },
			{ label: "Money rank", value: detail.economy.rank === null ? "Unranked" : `#${String(detail.economy.rank)}` },
		);
	}
	if (detail.levels !== null) {
		rows.push(
			{ label: "Level", value: detail.levels.level.toLocaleString() },
			{ label: "XP", value: detail.levels.xp.toLocaleString() },
			{ label: "Level rank", value: detail.levels.rank === null ? "Unranked" : `#${String(detail.levels.rank)}` },
		);
	}

	return rows;
}
