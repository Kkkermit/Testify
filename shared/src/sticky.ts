import { z } from "zod";
import { type Problem, problem } from "./problems";
import { snowflake } from "./schemas";
import { plainText } from "./text";

export const STICKY_LIMITS = {
	maxMessage: 2_000,
	minCap: 1,
	maxCap: 50,
	/** One sticky per channel, and a server with hundreds would repost more than it reads. */
	maxPerGuild: 25,
} as const;

export interface StickyEntry {
	channelId: string;
	message: string;
	/** Messages between reposts. The bot counts up and reposts when it reaches this. */
	cap: number;
	/** How many messages have passed since the last repost. */
	count: number;
	posted: boolean;
	/** False when the bot cannot post in the channel, so a sticky that will never appear says so. */
	canSend: boolean;
}

export interface StickyList {
	entries: StickyEntry[];
	limit: number;
}

export const stickyPut = z.object({
	channelId: snowflake,
	message: plainText(1, STICKY_LIMITS.maxMessage),
	cap: z.coerce.number().int().min(STICKY_LIMITS.minCap).max(STICKY_LIMITS.maxCap),
});

export type StickyPut = z.infer<typeof stickyPut>;

export const stickyChannelParam = z.object({ channelId: snowflake });

/** Why a sticky cannot be saved, in the words the form shows — the same rules the API enforces. */
export function stickyBlocked(entry: { channelId: string | null; message: string }, taken: string[]): Problem | null {
	if (entry.channelId === null) return problem("sticky.channel");
	if (taken.includes(entry.channelId)) return problem("sticky.duplicate");
	if (entry.message.trim() === "") return problem("sticky.message");

	return null;
}
