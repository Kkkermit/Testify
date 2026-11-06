import { z } from "zod";
import { type Paged } from "./api";
import { snowflake } from "./schemas";

/** Stands in for somebody who deleted their data on a record a server keeps; no Discord id is a single digit. */
export const DELETED_USER_ID = "0";

export const eraseAccountSchema = z.object({ confirm: z.string().max(64) });

export type EraseAccountRequest = z.infer<typeof eraseAccountSchema>;

/** Written where a server's record needs a name, and translated wherever the dashboard shows one. */
export const DELETED_USER_NAME = "Deleted user";

export const ACCOUNT_LIMITS = {
	/** Change records are kept for ninety days, so a person's own history reaches no further back. */
	historyDays: 90,
	historyPerPage: 25,
} as const;

/** A change the reader made, from the dashboard or with a command; `guildName` is null once the bot has left. */
export interface AccountChange {
	id: string;
	at: string;
	/** Null for the owner console, which is not about one server. */
	guildId: string | null;
	guildName: string | null;
	source: "dashboard" | "command";
	summary: string;
}

export interface AccountHistory extends Paged<AccountChange> {
	/** Every server the reader has a change recorded in, so the filter offers only those. */
	servers: { id: string; name: string | null }[];
}

export const accountHistoryQuery = z.object({
	page: z.coerce.number().int().min(1).max(1_000).default(1),
	server: snowflake.optional(),
});

export type ReminderRoute = "channel" | "dm";

/** One of the reader's own reminders; the channel is never named, since they may no longer be able to see it. */
export interface AccountReminder {
	id: string;
	text: string;
	dueAt: string;
	deliver: ReminderRoute;
	/** False for a reminder set in a direct message, which can only ever be delivered by one. */
	canPing: boolean;
	guildId: string | null;
	guildName: string | null;
}

export const reminderRouteSchema = z.object({ deliver: z.enum(["channel", "dm"]) });

export const reminderParams = z.object({ reminderId: z.string().regex(/^[a-f\d]{24}$/, "must be a reminder id") });

/** A browser the reader is signed in on; `id` is a digest of the session, never the cookie itself. */
export interface AccountSession {
	id: string;
	createdAt: string;
	lastSeenAt: string;
	expiresAt: string;
	current: boolean;
}

export const sessionParams = z.object({ sessionId: z.string().regex(/^[a-f\d]{24}$/, "must be a session handle") });
