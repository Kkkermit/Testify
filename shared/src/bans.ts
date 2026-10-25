import { z } from "zod";
import { WARNING_LIMITS } from "./memberDetail";
import { plainLine } from "./text";

/** A server's bans, read live from Discord, with Unban beside each. */

export const BAN_LIMITS = {
	perPage: 25,
	maxQuery: 100,
	/** Discord hands back at most this many bans in one request. */
	maxRead: 1_000,
} as const;

export interface BanEntry {
	userId: string;
	username: string;
	avatarUrl: string | null;
	/** What Discord holds, which includes who banned them when it came from this bot. */
	reason: string | null;
	/** Set while it is a softban that lifts itself. */
	softbanEndsAt: string | null;
}

export interface BanPage {
	/** False when the bot lacks Ban Members, so Discord would not say who is banned. */
	readable: boolean;
	items: BanEntry[];
	total: number;
	page: number;
	perPage: number;
	/** True when the server holds more bans than one read returns, so the list is not every one. */
	truncated: boolean;
}

export const banQuery = z.object({
	page: z.coerce.number().int().min(1).default(1),
	q: plainLine(0, BAN_LIMITS.maxQuery).default(""),
});

export const unbanBody = z.object({
	reason: plainLine(WARNING_LIMITS.minReason, WARNING_LIMITS.maxReason).optional(),
});

export type UnbanBody = z.infer<typeof unbanBody>;
