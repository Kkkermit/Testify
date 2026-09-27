import { z } from "zod";
import { snowflake } from "./schemas";
import { plainLine } from "./text";

/** The bot-wide block list, global by design (AGENTS.md §12). */

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

/** The server's name, typed to confirm and compared by the server, since leaving cannot be undone from here. */
export const leaveGuildRequest = z.object({ confirm: z.string().min(1).max(100) });
