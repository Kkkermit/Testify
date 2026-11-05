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

/** `typicalMs` is the median run in a server. */
export interface SlowCommandRow {
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
	/** Read from the run log, so it covers at most `RUN_RETENTION_DAYS`. */
	runDays: number;
	slowest: SlowCommandRow[];
	screens: ScreenTally[];
}

/** Who ran what is kept for fewer days than the counts, so the per-member figures can cover less than the window. */
export const RUN_RETENTION_DAYS = 30;

export interface GuildUsageReport {
	guild: GuildUsageRow & { joinedAt: string | null };
	days: number;
	memberDays: number;
	runs: number;
	failures: number;
	surfaces: { slash: number; prefix: number };
	daily: UsageDay[];
	commands: CommandUsageRow[];
	dashboardViews: number;
	members: number;
}

export interface MemberUsageRow {
	userId: string;
	/** As it was on their latest run, so somebody who has left is still named. */
	username: string;
	avatarUrl: string | null;
	runs: number;
	failures: number;
	prefix: number;
	commandCount: number;
	topCommands: { command: string; count: number }[];
	lastAt: string;
}

export interface CommandRunRow {
	at: string;
	userId: string;
	username: string;
	command: string;
	subcommand: string | null;
	surface: "slash" | "prefix";
	failed: boolean;
	/** What an unexpected failure was logged under, which finds it on the Logs tab; null for a refusal. */
	reference: string | null;
	durationMs: number;
	channelId: string | null;
	/** Null when the channel has since gone, or it was never cached. */
	channelName: string | null;
}

export const MAX_MEMBER_SEARCH = 100;

export const guildMembersQuery = analyticsQuery.extend(pagination.shape).extend({
	/** A name, an ID or a pasted `<@mention>`. */
	q: z.string().trim().max(MAX_MEMBER_SEARCH).optional(),
});

export const guildRunsQuery = analyticsQuery.extend(pagination.shape).extend({
	userId: snowflake.optional(),
	command: z
		.string()
		.regex(/^[\w-]{1,32}$/, "must be a command name")
		.optional(),
});

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

export const MAX_GUILD_SEARCH = 100;

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

/** Screens opened, by route pattern and bot-wide; no guild or user id, since a server's managers are identifiable. */
export interface ScreenTally {
	route: string;
	count: number;
}

/** Every dashboard screen a view is counted against, so a request cannot fill the tally with routes of its own. */
export const SCREEN_ROUTES = [
	"/account",
	"/appearance",
	"/guilds",
	"/guilds/compare",
	"/guilds/:guildId",
	"/guilds/:guildId/insights",
	"/guilds/:guildId/levelling",
	"/guilds/:guildId/welcome",
	"/guilds/:guildId/audit-log",
	"/guilds/:guildId/settings",
	"/guilds/:guildId/automod",
	"/guilds/:guildId/sticky",
	"/guilds/:guildId/auto-responders",
	"/guilds/:guildId/birthdays",
	"/guilds/:guildId/cases",
	"/guilds/:guildId/raid-protection",
	"/guilds/:guildId/bans",
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

export type ScreenRoute = (typeof SCREEN_ROUTES)[number];

export function isScreenRoute(route: string): route is ScreenRoute {
	return (SCREEN_ROUTES as readonly string[]).includes(route);
}

/** `guildId` is counted only when the person sending it may manage that server, which the API checks. */
export const screenView = z.object({ route: z.enum(SCREEN_ROUTES), guildId: snowflake.optional() });

export type ScreenView = z.infer<typeof screenView>;

export function errorRate({ runs, failures }: { runs: number; failures: number }): number {
	return runs === 0 ? 0 : failures / runs;
}
