import { z } from "zod";

/** A server at a glance: facts Discord holds, plus daily counts of messages, joins and leaves. */

export const INSIGHTS_LIMITS = {
	/** Counts older than this are deleted, so a window can never reach further back. */
	retentionDays: 30,
	topChannels: 5,
	topMembers: 10,
	recentMoves: 10,
} as const;

export const INSIGHT_WINDOWS = [7, 30] as const;

export type InsightWindow = (typeof INSIGHT_WINDOWS)[number];

export const insightsQuery = z.object({
	days: z.coerce
		.number()
		.int()
		.refine((days) => INSIGHT_WINDOWS.some((window) => window === days), "must be 7 or 30")
		.default(7),
});

export const VERIFICATION_LEVELS = ["none", "low", "medium", "high", "highest"] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export interface ServerFacts {
	createdAt: string;
	ownerId: string;
	ownerName: string | null;
	members: number;
	people: number;
	bots: number;
	textChannels: number;
	voiceChannels: number;
	categories: number;
	roles: number;
	emojis: number;
	stickers: number;
	boostTier: number;
	boosts: number;
	verification: VerificationLevel;
}

export interface InsightDay {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	messages: number;
	joins: number;
	leaves: number;
}

export interface ChannelActivity {
	channelId: string;
	/** Null once the channel has been deleted. */
	name: string | null;
	messages: number;
}

export interface MemberActivity {
	userId: string;
	name: string;
	avatarUrl: string | null;
	messages: number;
}

export interface MemberMove {
	userId: string;
	name: string;
	at: string;
}

export interface InsightsReport {
	days: InsightWindow;
	server: ServerFacts;
	/** The first day anything was counted for this server, or null before the first message. */
	countingSince: string | null;
	totals: { messages: number; activeMembers: number; joins: number; leaves: number };
	/** Every day of the window, oldest first, with zeros where nothing happened. */
	daily: InsightDay[];
	/** Messages in each UTC hour across the window, midnight first. */
	hours: number[];
	topChannels: ChannelActivity[];
	topMembers: MemberActivity[];
	recentJoins: MemberMove[];
	recentLeaves: MemberMove[];
}

/** The hour with the most messages, or null when there were none; ties go to the earlier hour. */
export function busiestHour(hours: readonly number[]): number | null {
	let best: number | null = null;
	hours.forEach((count, hour) => {
		if (count > 0 && (best === null || count > (hours[best] ?? 0))) best = hour;
	});

	return best;
}

export function averagePerDay(total: number, days: number): number {
	return days <= 0 ? 0 : Math.round((total / days) * 10) / 10;
}
