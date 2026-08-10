import { z } from "zod";
import { snowflake } from "./schemas";
import { plainLine } from "./text";

/**
 * Running giveaways, shared so the browser form and the API agree on the same bounds.
 *
 * The duration crosses as milliseconds rather than as `3d`: the bot parses that shorthand for Discord, and a
 * second parser in the browser is a second set of rules to keep in step.
 */

export const GIVEAWAY_LIMITS = {
	maxPrize: 256,
	minWinners: 1,
	maxWinners: 20,
	minDurationMs: 60_000,
	maxDurationMs: 30 * 24 * 60 * 60 * 1000,
} as const;

/** The tag is null when Discord no longer knows the account; the id still identifies the entry. */
export interface GiveawayWinner {
	id: string;
	tag: string | null;
}

export interface GiveawayRow {
	messageId: string;
	channelId: string;
	prize: string;
	winnerCount: number;
	startAt: string;
	endAt: string;
	ended: boolean;
	/** Announced publicly by the bot when it draws, so listing them here reveals nothing new. */
	winners: GiveawayWinner[];
	hostedBy: string | null;
}

export interface GiveawayList {
	giveaways: GiveawayRow[];
}

export const giveawayStart = z.object({
	channelId: snowflake,
	prize: plainLine(1, GIVEAWAY_LIMITS.maxPrize),
	winnerCount: z.number().int().min(GIVEAWAY_LIMITS.minWinners).max(GIVEAWAY_LIMITS.maxWinners),
	durationMs: z.number().int().min(GIVEAWAY_LIMITS.minDurationMs).max(GIVEAWAY_LIMITS.maxDurationMs),
});

export type GiveawayStart = z.infer<typeof giveawayStart>;

/** A Discord message id, which is how `discord-giveaways` keys everything. */
export const giveawayParams = z.object({ messageId: snowflake });

/** Says what is wrong with a draft, so the form can refuse before the request rather than after it. */
export function giveawayProblem(draft: {
	channelId: string | null;
	prize: string;
	winnerCount: number;
	durationMs: number;
}): string | null {
	if (draft.channelId === null) return "Pick a channel to post it in.";
	if (draft.prize.trim() === "") return "Say what is being given away.";
	if (draft.prize.length > GIVEAWAY_LIMITS.maxPrize) {
		return `The prize cannot be longer than ${String(GIVEAWAY_LIMITS.maxPrize)} characters.`;
	}
	if (!Number.isInteger(draft.winnerCount) || draft.winnerCount < GIVEAWAY_LIMITS.minWinners) {
		return "There has to be at least one winner.";
	}
	if (draft.winnerCount > GIVEAWAY_LIMITS.maxWinners) {
		return `Discord will not let one giveaway have more than ${String(GIVEAWAY_LIMITS.maxWinners)} winners.`;
	}
	if (draft.durationMs < GIVEAWAY_LIMITS.minDurationMs) return "A giveaway has to run for at least a minute.";
	if (draft.durationMs > GIVEAWAY_LIMITS.maxDurationMs) return "A giveaway cannot run for longer than 30 days.";

	return null;
}
