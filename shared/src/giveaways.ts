import { z } from "zod";
import { type Problem, problem } from "./problems";
import { snowflake } from "./schemas";
import { plainLine } from "./text";

/**
 * Giveaway bounds shared by the form and the API; the duration crosses as milliseconds, so only the bot parses `3d`.
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
}): Problem | null {
	if (draft.channelId === null) return problem("giveaway.channel");
	if (draft.prize.trim() === "") return problem("giveaway.prize");
	if (draft.prize.length > GIVEAWAY_LIMITS.maxPrize) {
		return problem("giveaway.prizeLength", { max: GIVEAWAY_LIMITS.maxPrize });
	}
	if (!Number.isInteger(draft.winnerCount) || draft.winnerCount < GIVEAWAY_LIMITS.minWinners) {
		return problem("giveaway.winners");
	}
	if (draft.winnerCount > GIVEAWAY_LIMITS.maxWinners) {
		return problem("giveaway.maxWinners", { max: GIVEAWAY_LIMITS.maxWinners });
	}
	if (draft.durationMs < GIVEAWAY_LIMITS.minDurationMs) return problem("giveaway.tooShort");
	if (draft.durationMs > GIVEAWAY_LIMITS.maxDurationMs) return problem("giveaway.tooLong");

	return null;
}
