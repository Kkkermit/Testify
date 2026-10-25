import { z } from "zod";
import { snowflake } from "./schemas";

/** One numbered record for every moderation action, whichever surface took it. */

export const CASE_ACTIONS = ["warn", "timeout", "untimeout", "kick", "ban", "softban", "unban"] as const;

export type CaseAction = (typeof CASE_ACTIONS)[number];

export const CASE_LIMITS = {
	perPage: 10,
	maxQuery: 100,
} as const;

export interface ModCase {
	/** Null for a warning given before cases were numbered, which is read rather than rewritten. */
	number: number | null;
	action: CaseAction;
	userId: string;
	username: string;
	moderatorId: string;
	moderatorName: string;
	reason: string;
	/** How long a timeout or softban lasts; null for everything else. */
	durationMs: number | null;
	at: string;
}

export interface CasePage {
	items: ModCase[];
	total: number;
	page: number;
	perPage: number;
}

export interface CaseSettings {
	logChannelId: string | null;
	/** False when the bot cannot post in the log channel, so a log that will stay empty says so. */
	canSend: boolean;
}

export const caseQuery = z.object({
	page: z.coerce.number().int().min(1).max(10_000).default(1),
	q: z.string().trim().max(CASE_LIMITS.maxQuery).default(""),
	action: z.enum(CASE_ACTIONS).optional(),
});

export const casePatch = z.object({ logChannelId: snowflake.nullable() });

export type CasePatch = z.infer<typeof casePatch>;
