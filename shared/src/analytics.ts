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

/** An IANA zone the runtime knows, which is what the collector accepts; the page sends the reader's own. */
const timeZone = z
	.string()
	.max(64)
	.refine((zone) => {
		if (!/^[A-Za-z][\w+-]*(\/[A-Za-z0-9][\w+-]*)*$/.test(zone)) return false;
		try {
			new Intl.DateTimeFormat("en", { timeZone: zone });
			return true;
		} catch {
			return false;
		}
	}, "must be a time zone")
	.default("UTC");

export const analyticsZoneQuery = analyticsQuery.extend({ tz: timeZone });

/** A command as the collector names it, which is the bot's own name for it. */
const commandName = z.string().regex(/^[\w-]{1,32}$/, "must be a command");

export const FUNNEL_WINDOWS = [1, 24, 72, 168] as const;

export const FUNNEL_LIMITS = { minSteps: 2, maxSteps: 5 } as const;

export const funnelQuery = analyticsZoneQuery.extend({
	/** The commands in order, separated by commas, so a funnel is an address that can be shared. */
	steps: z
		.string()
		.max(200)
		.transform((text) => text.split(",").map((step) => step.trim()))
		.pipe(z.array(commandName).min(FUNNEL_LIMITS.minSteps).max(FUNNEL_LIMITS.maxSteps)),
	hours: z.coerce
		.number()
		.int()
		.refine((value) => (FUNNEL_WINDOWS as readonly number[]).includes(value), {
			message: `must be one of ${FUNNEL_WINDOWS.join(", ")}`,
		})
		.default(24),
});

export const RETENTION_INTERVALS = ["day", "week"] as const;

export const retentionQuery = analyticsZoneQuery.extend({
	start: commandName,
	/** Absent for coming back to the bot at all. */
	back: commandName.optional(),
	interval: z.enum(RETENTION_INTERVALS).default("week"),
});

export interface Tally {
	key: string;
	count: number;
}

/** Who ran a command, as Discord's permissions put them, or a direct message. */
export const MEMBER_TIERS = ["admin", "manager", "member", "dm"] as const;

export interface AudienceReport {
	days: number;
	/** People who used the bot each day and how many of them were new, oldest first and zero-filled. */
	daily: { day: string; users: number; newUsers: number }[];
	/** Daily users over monthly users, null until the collector has a month to divide by. */
	stickiness: number | null;
	/** The Discord languages of the people running slash commands; a prefix run carries none. */
	userLanguages: Tally[];
	/** Each server's own language, read from Discord now rather than from the collector. */
	serverLanguages: Tally[];
	tiers: Tally[];
	/** Discord's interaction contexts: `0` a server, `1` the bot's direct messages, `2` another direct message. */
	contexts: Tally[];
	/** Commands by weekday (1 is Monday) and hour, in `timezone`. */
	hours: { timezone: string; cells: { weekday: number; hour: number; count: number }[] };
}

export interface GrowthReport {
	days: number;
	daily: { day: string; joins: number; leaves: number }[];
	joins: number;
	leaves: number;
	/** Servers that ran a command within a day of adding the bot. */
	activation: { joined: number; activated: number; rate: number | null };
	/** Servers the bot is in, and how many of them have run nothing for 30 days. */
	installs: { active: number; inactive: number } | null;
	/** How big a server was when it added the bot. */
	sizeAtInstall: Tally[];
	/** How long a server that left had kept the bot. */
	lifetimes: Tally[];
	/** The collector's own count beside Discord's; `warn` when they differ by more than 2%. */
	serverCount: { ours: number; discord: number | null; warn: boolean };
}

export interface PanelButtonRow {
	/** The handler's id, the first part of every custom ID it builds. */
	id: string;
	presses: number;
	failures: number;
	actions: Tally[];
}

export interface PanelFormRow {
	/** The handler the form belongs to, the first part of its custom ID. */
	id: string;
	shown: number;
	submitted: number;
}

export interface PanelsReport {
	days: number;
	buttons: PanelButtonRow[];
	forms: PanelFormRow[];
}

/** Why a command was refused before it ran. */
export const REFUSAL_REASONS = [
	"owner_only",
	"paused",
	"blacklisted",
	"off_everywhere",
	"off_here",
	"feature_off",
	"no_subcommand",
	"music",
	"casino",
	"guild_only",
	"nsfw_only",
	"you_lack",
	"bot_lacks",
	"cooldown",
] as const;

export type RefusalReason = (typeof REFUSAL_REASONS)[number];

/** Why a track was given up on or a request refused: what the downloader said, or one of the bot's own reasons. */
export const MUSIC_REASONS = [
	"forbidden",
	"bot-check",
	"session",
	"unavailable",
	"drm",
	"disk",
	"unplayable",
	"broken",
	"error",
] as const;

export type MusicReason = (typeof MUSIC_REASONS)[number];

/** How the help desk chose an article: the model, search, or the reader picking one from the typeahead. */
export const SUPPORT_WAYS = ["model", "search", "picked"] as const;

export type SupportWay = (typeof SUPPORT_WAYS)[number];

/** How a dashboard change was made: saved on its screen, put back from Changes, brought in from a backup, or set up. */
export const CHANGE_WAYS = ["save", "put_back", "backup", "setup"] as const;

export type ChangeWay = (typeof CHANGE_WAYS)[number];

/** The header the page sends with a write that puts a change back or brings a backup in; anything else is a save. */
export const CHANGE_WAY_HEADER = "x-testify-via";

/** What the bot does on its own, each counted under its own name so its total outlasts the raw events. */
export const AUTOMATIC_ACTIONS = [
	"auto_reply",
	"link_deleted",
	"level_up",
	"star_post",
	"reminder_sent",
	"schedule_post",
	"birthday_post",
	"raid_hold",
] as const;

export type AutomaticAction = (typeof AUTOMATIC_ACTIONS)[number];

export interface BotActivityReport {
	days: number;
	/** Every breakdown here comes from raw events, which the collector keeps this long; the totals go further. */
	detailDays: number;
	music: {
		played: number;
		skipped: number;
		refused: number;
		sources: Tally[];
		/** Skipped and refused together, by service and reason, so a host YouTube has flagged stands out. */
		causes: { source: string; reason: string; count: number }[];
	};
	support: { answered: number; refused: number; answeredBy: Tally[]; refusedBy: Tally[]; articles: Tally[] };
	refusals: { total: number; reasons: Tally[]; commands: Tally[] };
	automatic: { action: AutomaticAction; count: number }[];
	changes: { total: number; screens: Tally[]; ways: Tally[] };
}

export interface ReliabilityReport {
	days: number;
	/** Runs by day: failures, and slash commands that missed Discord's three seconds or never answered. */
	daily: { day: string; runs: number; errors: number; late: number }[];
	/** From raw events, so it reaches back only as far as `from`. */
	totals: {
		runs: number;
		missedDeadlines: number;
		noResponse: number;
		errors: number;
		over3sRate: number | null;
		p50Ms: number | null;
		p95Ms: number | null;
		p99Ms: number | null;
	} | null;
	from: string;
	errorsByCode: Tally[];
	rateLimits: { daily: { day: string; count: number }[]; routes: { route: string; scope: string; count: number }[] };
	shards: {
		now: { shard: number; pingMs: number; stale: boolean }[];
		/** The gateway's average ping each day, every shard together. */
		daily: { day: string; pingMs: number | null }[];
		events: { at: string; shard: number; state: string; closeCode: number | null }[];
	};
}

export interface FunnelReport {
	days: number;
	hours: number;
	steps: { command: string; users: number; medianSeconds: number | null }[];
}

export interface RetentionReport {
	days: number;
	interval: (typeof RETENTION_INTERVALS)[number];
	start: string;
	back: string | null;
	periods: number;
	cohorts: { cohort: string; size: number; retained: number[] }[];
}
