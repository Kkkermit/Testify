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
	/** Which dashboard screens were opened, bot-wide. */
	screens: ScreenTally[];
}

/** Every level pino has, so the console can show the whole buffer rather than a slice of it. */
export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

export type ReportedLogLevel = (typeof LOG_LEVELS)[number];

/** Ranked, so "at least warn" is a comparison rather than a list membership test. */
export const LOG_LEVEL_RANK: Record<ReportedLogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
};

export const MAX_LOG_SEARCH = 100;

export const logQuery = z.object({
	limit: z.coerce.number().int().min(1).max(1_000).default(200),
	level: z.enum(LOG_LEVELS).default("trace"),
	/** Free text matched against the message and the context, so a guild id finds every line about it. */
	q: z.string().trim().max(MAX_LOG_SEARCH).optional(),
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
	/**
	 * The level the bot's logger is running at. Nothing below it is ever written, so the console has to say so
	 * rather than showing an empty list and letting somebody conclude the bot is idle.
	 */
	loggerLevel: ReportedLogLevel;
	/** How many lines matched, before `limit` cut the list down. */
	matched: number;
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
	/** Round trip to Discord’s gateway. The one number that says whether the bot is healthy right now. */
	gatewayPingMs: number;
	shards: number;
	cachedUsers: number;
	cachedChannels: number;
}

/**
 * Which dashboard screens get opened, bot-wide and by route pattern.
 *
 * No guild id and no user id: a server has one or two people who can open this dashboard, so a per-server count
 * would describe one identifiable person’s browsing rather than an aggregate.
 */
export interface ScreenTally {
	route: string;
	count: number;
}

export const screenView = z.object({ route: z.string().min(1).max(120) });

export function errorRate({ runs, failures }: { runs: number; failures: number }): number {
	return runs === 0 ? 0 : failures / runs;
}
