import { z } from "zod";
import { COMMAND_NAME, pagination, snowflake } from "./schemas";

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

/** Why the console cannot show analytics: no key, a key the collector refuses, no answer, or no activity log kept. */
export const ANALYTICS_PROBLEMS = ["off", "refused", "unreachable", "audit_off"] as const;

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
	/** What the collector knows of the server; null for one it has never seen. */
	profile: GuildProfile | null;
	collector: string;
}

export interface GuildProfile {
	/** Members when the bot was added, and whether it only noticed at start-up, having been offline. */
	sizeAtJoin: number | null;
	firstCommandAt: string | null;
	lastCommandAt: string | null;
	/** Discord's names of the permissions the collector's settings require that the bot lacks there. */
	missingPermissions: string[];
	/** The newest joins, leaves and outages first. */
	history: { at: string; kind: "join" | "leave" | "unavailable" | "available"; atStartup: boolean }[];
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

export type ShardlensState = "off" | "waiting" | "sending";

export interface ShardlensStatus {
	state: ShardlensState;
	/** The collector's origin, where its own dashboard opens, or null with no address set. */
	collector: string | null;
	/** The collector runs inside the bot, and its dashboard opens only on the machine the bot runs on. */
	embedded: boolean;
	/** Privacy unless the bot and the collector both chose audit, and null until the collector has answered. */
	mode: "privacy" | "audit" | null;
	queued: number;
	waitingForResponse: number;
	dropped: number;
	failedSends: number;
	/** The last problem the SDK reported, by its own short name such as `network`, never its message. */
	lastProblem: { name: string; at: string } | null;
}

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

/** An IANA zone the runtime knows. */
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

const commandName = z.string().regex(COMMAND_NAME, "must be a command");

export const FUNNEL_WINDOWS = [1, 24, 72, 168] as const;

export const FUNNEL_LIMITS = { minSteps: 2, maxSteps: 5 } as const;

export const funnelQuery = analyticsZoneQuery.extend({
	/** The commands in order, comma-separated. */
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
	/** Oldest first and zero-filled. */
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
	/** Oldest first, each week by its Monday. */
	weekly: { week: string; users: number }[];
	/** Each counting period's people; `final` once it has ended and can no longer change. */
	periods: { period: string; users: number; final: boolean }[];
	/** How the bot was installed where it ran: `guild`, `user` or `both`. */
	installs: Tally[];
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
	/** Joins and leaves the bot only noticed at start-up, having been offline when they happened. */
	detected: { joins: number; leaves: number };
	/** Discord's own count of the bot's servers, each day it was reported; zero-filled is wrong here, so it has gaps. */
	discordCount: { day: string; value: number | null }[];
	/** Servers by the week they added the bot, and how many ran a command that week and each week after. */
	cohorts: { cohort: string; weeks: number[] }[];
	/** Discord's webhook events: adds and removals by day, and the scopes granted. */
	installsFromDiscord: {
		/** 1 disabled, 2 enabled, 3 disabled by Discord; null until the bot has said. */
		webhookStatus: number | null;
		daily: { day: string; serverInstalls: number; userInstalls: number; userRemovals: number }[];
		scopes: Tally[];
	};
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

/** What the bot does on its own, each the name of the event it is counted under. */
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
	/** Every event the bot counts under its own name, the most frequent first. */
	events: { name: string; count: number; people: number; lastAt: string }[];
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
	/** Calls to Discord's API by route; `failures` are answers of 400 and above. */
	rest: { method: string; route: string; calls: number; failures: number; retries: number; p95Ms: number | null }[];
	/** 401, 403 and 429 answers in the last ten minutes against Discord's limit, past which it blocks the bot. */
	invalidRequests: { used: number; limit: number; share: number } | null;
	/** Gateway session starts left today; Discord refuses to connect once they run out. */
	sessions: { remaining: number; total: number } | null;
	/** Memory and event-loop delay each day, the bot's average and its worst minute. */
	process: {
		memory: { day: string; value: number | null; max: number | null }[];
		eventLoop: { day: string; value: number | null; max: number | null }[];
	};
	/** Minutes with far more runs than usual, the busiest first; the collector looks back 14 days. */
	bursts: { minute: string; runs: number; median: number }[];
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

export const commandParam = z.object({ name: commandName });

/** One command in depth, from raw events, so it reaches back only as far as `from`. */
export interface CommandReport {
	command: string;
	category: string;
	days: number;
	from: string;
	daily: UsageDay[];
	totals: {
		runs: number;
		ok: number;
		errors: number;
		/** Answered after Discord's three seconds. */
		late: number;
		noResponse: number;
		deferRate: number | null;
		ephemeralRate: number | null;
		over3sRate: number | null;
		/** How long the handler itself took, the slowest one in twenty. */
		handlerP95Ms: number | null;
		firstAt: string | null;
		lastAt: string | null;
	};
	/** Runs by time to the first reply, in buckets on a log scale; null when nothing answered. */
	latency: number[] | null;
	kinds: Tally[];
	subcommands: Tally[];
	options: Tally[];
	/** Values of options with a fixed list of choices, the only ones the bot sends. */
	optionValues: { option: string; value: string; runs: number }[];
	tiers: Tally[];
	installs: Tally[];
	contexts: Tally[];
	channelTypes: Tally[];
	locales: Tally[];
	servers: GuildUsageRow[];
	/** The bot's own handlers on the command's messages, by handler and action. */
	components: { handler: string; kind: string; count: number }[];
	forms: PanelFormRow[];
	collector: string;
}

/** Bucket `i` of `CommandReport.latency` ends at this many milliseconds. */
export const LATENCY_BUCKETS = 40;

export const latencyBucketEnd = (index: number): number => 60_000 ** ((index + 1) / (LATENCY_BUCKETS - 1));

/** How the collector is set up and whether the bot is reaching it, from the collector's side. */
export interface CollectorSetup {
	collector: string;
	/** The collector runs inside the bot, so what a missing step needs is set on the bot. */
	embedded: boolean;
	app: {
		name: string;
		mode: "privacy" | "audit";
		saltPeriod: "day" | "week" | "month";
		timezone: string;
		/** How long single events are kept, which is how far back every breakdown reaches. */
		rawRetentionDays: number;
		/** Whether people can sign in to the collector's own dashboard with Discord. */
		discordLogin: boolean;
	};
	checks: {
		receivingEvents: boolean;
		appInfoReceived: boolean;
		webhookEventsEnabled: boolean;
		requiredPermissionsSet: boolean;
		/** Who ran what: the collector in audit mode with its key, and the bot holding an activity key to read it. */
		auditMode: boolean;
		auditKey: boolean;
		activityKey: boolean;
	};
	lastEventAt: string | null;
	servers: number;
	people: number | null;
	/** What the bot last reported about itself; null until it has. */
	bot: {
		at: string;
		approxServers: number | null;
		approxUserInstalls: number | null;
		sessionsLeft: number | null;
		sessionsTotal: number | null;
		nodeVersion: string | null;
		libraryVersion: string | null;
		sdkVersion: string | null;
		release: string | null;
	} | null;
	/** Each process of the bot, as its SDK last reported. */
	instances: {
		instance: string;
		at: string;
		shards: number[];
		queued: number;
		dropped: number;
		failedSends: number;
		internalErrors: number;
		sdkVersion: string | null;
	}[];
}

/** How a run ended, as the collector names it: `timeout` missed Discord's three seconds, `no_response` never answered. */
export const RUN_OUTCOMES = ["ok", "error", "timeout", "no_response"] as const;

export type RunOutcome = (typeof RUN_OUTCOMES)[number];

/** `failed` is every outcome but `ok`. */
export const RUN_FILTERS = ["failed", ...RUN_OUTCOMES] as const;

/** A page of the activity log is a time, then `~` and the last row's ID, exactly as the collector hands it back. */
const RUN_CURSOR =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z~[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A body rather than a query, so a user id never lands in an address, where a proxy, a log or a history keeps it. */
export const runsBody = z.strictObject({
	days: analyticsQuery.shape.days,
	guildId: snowflake.optional(),
	command: z.string().regex(COMMAND_NAME, "must be a command").optional(),
	/** An exact Discord id: the only way to look one person up. */
	userId: snowflake.optional(),
	outcome: z.enum(RUN_FILTERS).optional(),
	before: z.string().max(64).regex(RUN_CURSOR, "must be a page from the collector").optional(),
});

export type RunsBody = z.output<typeof runsBody>;

/** What the console narrows the log by; the window is the tab's own. */
export type RunsFilters = Omit<RunsBody, "days" | "before">;

export interface RunRow {
	/** The collector's id for the run, not Discord's. */
	id: string;
	at: string;
	guildId: string | null;
	/** Chosen by the server's owner, so drawn as text. */
	guildName: string | null;
	/** `chat_input`, `button`, `select`, `modal_submit`, `message_command` and the rest. */
	kind: string;
	command: string | null;
	sub: string | null;
	/** A component's handler and action, and only for the bot's own handlers. */
	handler: string | null;
	outcome: RunOutcome;
	/** How long Discord waited for the first reply; null for a prefix run, which has none. */
	answerMs: number | null;
	/** Null for a run written under another audit key, which this one cannot read. */
	userId: string | null;
	/** Chosen by the person, so drawn as text. */
	username: string | null;
	avatarUrl: string | null;
}

export interface RunsPage {
	rows: RunRow[];
	/** Pass back as `before` for the page after; null on the last. */
	next: string | null;
	collector: string;
}

export const TOP_RUNNER_WINDOWS = ["24h", "7d"] as const;

export const topRunnersQuery = z.object({ window: z.enum(TOP_RUNNER_WINDOWS).default("24h") });

export interface TopRunners {
	window: (typeof TOP_RUNNER_WINDOWS)[number];
	/** Up to 25, the busiest first; a name only for somebody the bot already knows, since nobody is fetched for it. */
	rows: { userId: string | null; username: string | null; avatarUrl: string | null; runs: number }[];
}

/** What the bot is doing this minute, from the collector's live stream. */
export interface LiveNumbers {
	at: string;
	/** Runs in the last 60 seconds. */
	perMinute: number;
	/** Failed runs in the last 15 minutes. */
	failed15m: number;
	/** Runs in each of the last 60 seconds, oldest first. */
	perSecond: number[];
	/** The slowest one in twenty first replies over the last five minutes. */
	slowMs: number | null;
	shards: { shard: number; pingMs: number; fresh: boolean }[];
	servers: number;
}

/** `numbers` is null while the stream connects, or when `problem` says why there are none. */
export interface LiveRead {
	numbers: LiveNumbers | null;
	problem: AnalyticsProblem | null;
}
