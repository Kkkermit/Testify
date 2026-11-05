import { z } from "zod";
import { type Problem, problem } from "./problems";

export const LOTTERY_FREQUENCIES = ["hourly", "daily", "weekly"] as const;

export type LotteryFrequency = (typeof LOTTERY_FREQUENCIES)[number];

export const LOTTERY_LIMITS = {
	minEntryFee: 1,
	maxEntryFee: 1_000_000,
	minWinners: 1,
	maxWinners: 10,
	minBasePool: 0,
	maxBasePool: 10_000_000,
} as const;

export interface LotteryDrawSummary {
	at: string;
	prizePool: number;
	tickets: number;
	winners: { userTag: string; prizeAmount: number }[];
}

export interface LotterySettings {
	enabled: boolean;
	frozen: boolean;
	entryFee: number;
	basePrizePool: number;
	maxWinners: number;
	frequency: LotteryFrequency;
	announcementChannelId: string | null;
	prizePool: number;
	ticketsSold: number;
	entrants: number;
	nextDrawAt: string | null;
	history: LotteryDrawSummary[];
}

export const lotteryPatch = z
	.object({
		entryFee: z.coerce.number().int().min(LOTTERY_LIMITS.minEntryFee).max(LOTTERY_LIMITS.maxEntryFee),
		basePrizePool: z.coerce.number().int().min(LOTTERY_LIMITS.minBasePool).max(LOTTERY_LIMITS.maxBasePool),
		maxWinners: z.coerce.number().int().min(LOTTERY_LIMITS.minWinners).max(LOTTERY_LIMITS.maxWinners),
		frequency: z.enum(LOTTERY_FREQUENCIES),
		announcementChannelId: z.string().regex(/^\d{17,20}$/, "is not a channel ID"),
		frozen: z.boolean(),
	})
	.partial();

export type LotteryPatch = z.infer<typeof lotteryPatch>;

export function lotteryBlocked(draft: { announcementChannelId: string | null; entryFee: number }): Problem | null {
	if (draft.announcementChannelId === null) return problem("lottery.channel");
	if (!Number.isInteger(draft.entryFee) || draft.entryFee < LOTTERY_LIMITS.minEntryFee) {
		return problem("lottery.entryFee", { min: LOTTERY_LIMITS.minEntryFee });
	}

	return null;
}
