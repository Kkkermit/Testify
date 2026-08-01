import { z } from "zod";

/**
 * What the owner console reports, shared so the page and the API describe the same numbers.
 *
 * Nothing here identifies a person. Usage is counted per command, per server and per day, which answers "what
 * is this bot actually used for" without turning a self-hoster's dashboard into a record of who did what.
 */

export const ANALYTICS_WINDOWS = [7, 30, 90] as const;

export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];

export const analyticsQuery = z.object({
	days: z.coerce
		.number()
		.int()
		.refine((value): value is AnalyticsWindow => (ANALYTICS_WINDOWS as readonly number[]).includes(value), {
			message: `must be one of ${ANALYTICS_WINDOWS.join(", ")}`,
		})
		.default(30),
});

export interface CommandUsageRow {
	command: string;
	category: string;
	count: number;
	failures: number;
}

export interface GuildUsageRow {
	guildId: string;
	name: string;
	iconUrl: string | null;
	memberCount: number;
	count: number;
}

export interface UsageDay {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	count: number;
	failures: number;
}

export interface UsageReport {
	days: number;
	runs: number;
	failures: number;
	activeGuilds: number;
	/** How many distinct commands were run at least once. */
	commandsUsed: number;
	/** Every command the bot has, so "used 0 times" is a number rather than an absence. */
	commandsTotal: number;
	surfaces: { slash: number; prefix: number };
	/** One entry per day in the window, zero-filled, oldest first — a chart needs the gaps. */
	daily: UsageDay[];
	mostUsed: CommandUsageRow[];
	leastUsed: CommandUsageRow[];
	busiestGuilds: GuildUsageRow[];
}

export const LOG_LEVELS = ["info", "warn", "error", "fatal"] as const;

export type ReportedLogLevel = (typeof LOG_LEVELS)[number];

export const logQuery = z.object({
	limit: z.coerce.number().int().min(1).max(250).default(100),
	level: z.enum(LOG_LEVELS).default("info"),
});

export interface LogLine {
	at: string;
	level: string;
	message: string;
	/** Structured context, with anything that looked like a secret already removed by the bot. */
	context: Record<string, unknown>;
}

export interface LogFeed {
	lines: LogLine[];
	/** How many the buffer is holding, so the page can say "the last 250" honestly. */
	buffered: number;
	capacity: number;
}

export interface RuntimeInfo {
	version: string;
	nodeVersion: string;
	discordVersion: string;
	platform: string;
	environment: string;
	startedAt: string;
	uptimeMs: number;
	memoryMb: { heapUsed: number; heapTotal: number; rss: number };
	/** Where to look for a newer release. Testify never phones home to check. */
	repositoryUrl: string;
	commands: number;
	events: number;
	guilds: number;
}

export function errorRate({ runs, failures }: { runs: number; failures: number }): number {
	return runs === 0 ? 0 : failures / runs;
}
