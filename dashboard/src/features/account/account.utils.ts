import { type AccountChange, type AccountSession, type ManageableGuild } from "@testify/shared";
import { comparable } from "@/features/compare/compare.utils";
import { oneOf } from "@/lib/oneOf";

export const ACCOUNT_TABS = ["history", "reminders", "sessions", "data"] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function accountTabFrom(raw: string | null): AccountTab {
	return oneOf(ACCOUNT_TABS, raw, "history");
}

/** A change opens that server's Changes page only while the reader can still manage it there. */
export function changeLink(change: Pick<AccountChange, "guildId">, guilds: readonly ManageableGuild[]): string | null {
	if (change.guildId === null) return null;

	return comparable(guilds).some((guild) => guild.id === change.guildId) ? `/guilds/${change.guildId}/changes` : null;
}

/** The browser asking first, then the rest by when each was last used. */
export function sessionsInOrder(sessions: readonly AccountSession[]): AccountSession[] {
	return [...sessions].sort(
		(a, b) => Number(b.current) - Number(a.current) || Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt),
	);
}
