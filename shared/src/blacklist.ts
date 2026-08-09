import { z } from "zod";
import { snowflake } from "./schemas";
import { plainLine } from "./text";

/**
 * The bot-wide block list. Global by design rather than per guild — it is the bot owner's answer to somebody
 * abusing the bot itself, so it cannot be scoped to one server (CLAUDE.md §12).
 */

export const BLACKLIST_LIMITS = { maxReason: 200 } as const;

export interface BlacklistRow {
	userId: string;
	/** Null when Discord no longer knows the account, which is not a reason to hide the entry. */
	tag: string | null;
	avatarUrl: string | null;
	reason: string;
	createdAt: string;
}

export const blacklistAdd = z.object({
	userId: snowflake,
	reason: plainLine(0, BLACKLIST_LIMITS.maxReason),
});

export type BlacklistAdd = z.infer<typeof blacklistAdd>;

export const blacklistUserParam = z.object({ userId: snowflake });

/**
 * Leaving a server is not reversible from this screen — the bot needs a fresh invite to get back in, and only
 * somebody in that server can issue one. So the name is typed rather than clicked, and the server compares it
 * rather than trusting the browser to have asked.
 */
export const leaveGuildRequest = z.object({ confirm: z.string().min(1).max(100) });

export type LeaveGuildRequest = z.infer<typeof leaveGuildRequest>;
