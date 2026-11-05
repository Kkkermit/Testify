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

/** The copy every giveaway is posted with, here so the dashboard's preview shows the very words the bot sends. */
export const GIVEAWAY_POST = {
	giveaway: "\u{1f389} **Giveaway** \u{1f389}",
	giveawayEnded: "\u{1f389} **Giveaway ended** \u{1f389}",
	inviteToParticipate: "React with \u{1f389} to enter",
	winMessage: "Congratulations {winners}, you won **{this.prize}**!",
	// Discord draws the relative timestamp as "in 3 hours", so the line must not say "in" itself.
	drawing: "Draws {timestamp}",
	dropMessage: "Be the first to react to win!",
	embedFooter: "{this.winnerCount} winner(s)",
	noWinner: "Nobody entered, so there is no winner.",
	hostedBy: "Hosted by {this.hostedBy}",
	winners: "Winner(s)",
	endedAt: "Ended at",
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
