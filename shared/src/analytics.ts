import { z } from "zod";
import { pagination, snowflake } from "./schemas";

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

/** Answer times from Shardlens: how long Discord waited for the bot's first reply. Slash commands only. */
interface SlowCommandRow {
	command: string;
	category: string;
	runs: number;
	typicalMs: number;
	/** The slowest one in twenty took at least this long. */
	slowMs: number;
}

export interface UsageDay {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	count: number;
	failures: number;
}

/** Why the console cannot show analytics: no read key, a key the collector refuses, or a collector not answering. */
export const ANALYTICS_PROBLEMS = ["off", "refused", "unreachable"] as const;

export type AnalyticsProblem = (typeof ANALYTICS_PROBLEMS)[number];

export interface UsageReport {
	days: number;
	runs: number;
	failures: number;
	activeGuilds: number;
	commandsUsed: number;
	/** Every command the bot has, so "used 0 times" is a number rather than an absence. */
	commandsTotal: number;
	surfaces: { slash: number; prefix: number };
	/** One entry per day in the window, zero-filled, oldest first — a chart needs the gaps. */
	daily: UsageDay[];
	mostUsed: CommandUsageRow[];
	leastUsed: CommandUsageRow[];
	busiestGuilds: GuildUsageRow[];
	dashboardGuilds: GuildUsageRow[];
	/** The dashboard's figures come from raw events, which the collector keeps this long. */
	detailDays: number;
	slowest: SlowCommandRow[];
	screens: ScreenTally[];
	/** The collector's origin, where its own dashboard opens. */
	collector: string;
}

export interface GuildUsageReport {
	guild: GuildUsageRow & { joinedAt: string | null };
	days: number;
	detailDays: number;
	runs: number;
	failures: number;
	surfaces: { slash: number; prefix: number };
	daily: UsageDay[];
	commands: CommandUsageRow[];
	dashboardViews: number;
	/** People who used the bot there this month, as the collector counts them; null before it has. */
	people: number | null;
	collector: string;
}

export const OWNER_GUILD_SORTS = [
	"members",
	"fewest",
	"newest",
	"oldest",
	"commands",
	"quietest",
	"dashboard",
	"name",
] as const;

export type OwnerGuildSort = (typeof OWNER_GUILD_SORTS)[number];

/** `inactive` is a server that ran no command in the default window: a candidate for leaving. */
export const OWNER_GUILD_FILTERS = ["all", "inactive"] as const;

export type OwnerGuildFilter = (typeof OWNER_GUILD_FILTERS)[number];

const MAX_GUILD_SEARCH = 100;

export const ownerGuildQuery = pagination.extend({
	sort: z.enum(OWNER_GUILD_SORTS).default("members"),
	filter: z.enum(OWNER_GUILD_FILTERS).default("all"),
	q: z.string().trim().max(MAX_GUILD_SEARCH).optional(),
});

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

export type ReportedLogLevel = (typeof LOG_LEVELS)[number];

export const LOG_LEVEL_RANK: Record<ReportedLogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
};

const MAX_LOG_SEARCH = 100;

export const LOG_LIMITS = {
	/** Runs kept, this one included, so the seventh start deletes the oldest. */
	runsKept: 6,
	/** Lines kept for each run, at every level, the oldest going first. */
	linesPerRun: 2_000,
} as const;

/** A run is named by the id it was given when the process started. */
const runId = z.uuid();

export const logQuery = z.object({
	limit: z.coerce.number().int().min(1).max(1_000).default(200),
	level: z.enum(LOG_LEVELS).default("trace"),
	/** Free text matched against the message and the context, so a guild id finds every line about it. */
	q: z.string().trim().max(MAX_LOG_SEARCH).optional(),
	/** Absent for the run the bot is in now. */
	run: runId.optional(),
});

export const logRunParams = z.object({ runId });

/** The list of runs counts the lines each holds that this level and search would show. */
export const logRunsQuery = logQuery.pick({ level: true, q: true });

export interface LogRun {
	id: string;
	startedAt: string;
	/** When it shut down; null while it runs, and for a run that stopped without shutting down. */
	endedAt: string | null;
	/** Its newest line, which is the nearest thing to an end for a run that stopped without one. */
	lastAt: string | null;
	version: string;
	current: boolean;
	/** How many of its lines the search shows at the level chosen; null without a search. */
	matched: number | null;
	lines: number;
	errors: number;
	warnings: number;
}

export interface LogRuns {
	runs: LogRun[];
	kept: number;
	/** The database could not be read, so only the run in memory is listed. */
	pastUnavailable: boolean;
}

export interface LogLine {
	at: string;
	level: string;
	message: string;
	/** Structured context, with anything that looked like a secret already removed by the bot. */
	context: Record<string, unknown>;
}

export interface LogFeed {
	/** The run these lines come from. */
	run: string;
	current: boolean;
	lines: LogLine[];
	buffered: number;
	capacity: number;
	loggerLevel: ReportedLogLevel;
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
	repositoryUrl: string;
	commands: number;
	events: number;
	guilds: number;
	gatewayPingMs: number;
	shards: number;
	cachedUsers: number;
	cachedChannels: number;
}

/** Shardlens's state: off unconfigured, waiting for the collector, or sending. */
export type ShardlensState = "off" | "waiting" | "sending";

/** How the bot's Shardlens analytics are doing, for the owner; it never carries the ingest key. */
export interface ShardlensStatus {
	state: ShardlensState;
	/** The collector's origin, where its own dashboard opens, or null with no address set. */
	collector: string | null;
	/** Privacy unless the bot and the collector both chose audit, and null until the collector has answered. */
	mode: "privacy" | "audit" | null;
	queued: number;
	waitingForResponse: number;
	dropped: number;
	failedSends: number;
	/** The last problem the SDK reported, by its own short name such as `network`, never its message. */
	lastProblem: { name: string; at: string } | null;
}

/** What Send now did: whether anything was waiting, and the problem the send hit, if it hit one. */
export interface ShardlensFlush {
	sent: number;
	problem: string | null;
	status: ShardlensStatus;
}

/** Screens opened, by route pattern and bot-wide; no guild or user id, since a server's managers are identifiable. */
export interface ScreenTally {
	route: string;
	count: number;
}

/** Every dashboard screen a view is counted against, so a request cannot fill the tally with routes of its own. */
export const SCREEN_ROUTES = [
	"/account",
	"/appeals",
	"/appearance",
	"/guilds",
	"/guilds/compare",
	"/guilds/:guildId",
	"/guilds/:guildId/insights",
	"/guilds/:guildId/invites",
	"/guilds/:guildId/levelling",
	"/guilds/:guildId/welcome",
	"/guilds/:guildId/audit-log",
	"/guilds/:guildId/settings",
	"/guilds/:guildId/backup",
	"/guilds/:guildId/access",
	"/guilds/:guildId/access/:userId",
	"/guilds/:guildId/automod",
	"/guilds/:guildId/sticky",
	"/guilds/:guildId/auto-responders",
	"/guilds/:guildId/birthdays",
	"/guilds/:guildId/cases",
	"/guilds/:guildId/raid-protection",
	"/guilds/:guildId/bans",
	"/guilds/:guildId/appeals",
	"/guilds/:guildId/modmail",
	"/guilds/:guildId/channel-tools",
	"/guilds/:guildId/channels/:channelId",
	"/guilds/:guildId/channels",
	"/guilds/:guildId/inbox",
	"/guilds/:guildId/week",
	"/guilds/:guildId/roles",
	"/guilds/:guildId/roles/:roleId",
	"/guilds/:guildId/announcements",
	"/guilds/:guildId/scheduled-messages",
	"/guilds/:guildId/role-menus",
	"/guilds/:guildId/ideas",
	"/guilds/:guildId/starboard",
	"/guilds/:guildId/temp-voice",
	"/guilds/:guildId/economy",
	"/guilds/:guildId/treasure",
	"/guilds/:guildId/music",
	"/guilds/:guildId/casino",
	"/guilds/:guildId/tickets",
	"/guilds/:guildId/warnings",
	"/guilds/:guildId/changes",
	"/guilds/:guildId/bot-stats",
	"/guilds/:guildId/member-count",
	"/guilds/:guildId/lottery",
	"/guilds/:guildId/giveaways",
	"/guilds/:guildId/members",
	"/guilds/:guildId/members/:userId",
	"/guilds/:guildId/commands",
	"/commands",
	"/help",
	"/status",
	"/notifications",
	"/owner",
] as const;

type ScreenRoute = (typeof SCREEN_ROUTES)[number];

export function isScreenRoute(route: string): route is ScreenRoute {
	return (SCREEN_ROUTES as readonly string[]).includes(route);
}

/** `guildId` is counted only when the person sending it may manage that server, which the API checks. */
export const screenView = z.object({ route: z.enum(SCREEN_ROUTES), guildId: snowflake.optional() });

export type ScreenView = z.infer<typeof screenView>;

export function errorRate({ runs, failures }: { runs: number; failures: number }): number {
	return runs === 0 ? 0 : failures / runs;
}
