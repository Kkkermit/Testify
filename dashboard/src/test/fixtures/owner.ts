import {
	type BlacklistRow,
	type BotControlState,
	type CommandCatalogue,
	type CommandRunResult,
	type CommandRunRow,
	type GuildUsageReport,
	type LogFeed,
	type LogRuns,
	type MemberUsageRow,
	type OwnerGuildDetail,
	type RuntimeInfo,
	type UsageReport,
} from "@testify/shared";
import { aGuild } from "@/test/fixtures/session";

export const botControl: BotControlState = { gateway: "online", since: null, guilds: 3, pingMs: 42 };

export const guildDetail: OwnerGuildDetail = {
	id: aGuild.id,
	name: aGuild.name,
	iconUrl: null,
	memberCount: 1_234,
	channelCount: 20,
	roleCount: 8,
	joinedAt: "2026-01-01T00:00:00.000Z",
	createdAt: "2025-01-01T00:00:00.000Z",
	ownerId: "700000000000000001",
	nickname: "Testy",
	highestRole: "Bots",
	missingPermissions: ["ManageRoles"],
	configured: ["levelling"],
	usage: 900,
	dashboardViews: 12,
};

export const runnable: CommandCatalogue = {
	prefix: "t?",
	categories: ["info"],
	commands: [
		{
			name: "ping",
			description: "Checks the bot is awake.",
			category: "info",
			aliases: [],
			subcommands: [],
			options: [],
			permissions: [],
			botPermissions: [],
			cooldownMs: null,
			guildOnly: false,
			ownerOnly: false,
			nsfw: false,
		},
		{
			name: "bot",
			description: "Information about the bot itself.",
			category: "info",
			aliases: [],
			subcommands: [
				{ name: "info", description: "General information.", aliases: [], options: [] },
				{ name: "uptime", description: "How long it has been running.", aliases: [], options: [] },
			],
			options: [],
			permissions: [],
			botPermissions: [],
			cooldownMs: null,
			guildOnly: false,
			ownerOnly: false,
			nsfw: false,
		},
		{
			name: "role-info",
			description: "Details about a role.",
			category: "info",
			aliases: [],
			subcommands: [],
			options: [
				{ name: "role", description: "Which role.", type: "role", required: true, choices: [], min: null, max: null },
				{
					name: "detail",
					description: "How much.",
					type: "string",
					required: false,
					choices: [
						{ name: "Full", value: "full" },
						{ name: "Short", value: "short" },
					],
					min: null,
					max: null,
				},
			],
			permissions: [],
			botPermissions: [],
			cooldownMs: null,
			guildOnly: true,
			ownerOnly: false,
			nsfw: false,
		},
	],
};

export const runResult: CommandRunResult = {
	command: "ping",
	subcommand: null,
	ranAt: "2026-08-09T12:00:00.000Z",
	outputs: [{ kind: "text", content: "Pong! 42ms" }],
	degraded: false,
};

export const blacklistRows: BlacklistRow[] = [
	{
		userId: "100000000000000007",
		tag: "spammer",
		avatarUrl: null,
		reason: "Spamming commands in three servers",
		createdAt: "2026-06-01T00:00:00.000Z",
	},
	{
		userId: "100000000000000008",
		tag: null,
		avatarUrl: null,
		reason: "No reason provided",
		createdAt: "2026-06-02T00:00:00.000Z",
	},
];

export const usageReport: UsageReport = {
	days: 30,
	runs: 1_240,
	failures: 12,
	activeGuilds: 3,
	commandsUsed: 2,
	commandsTotal: 76,
	surfaces: { slash: 1_100, prefix: 140 },
	daily: [
		{ day: "2026-07-31", count: 500, failures: 4 },
		{ day: "2026-08-01", count: 740, failures: 8 },
	],
	mostUsed: [
		{ command: "rank", category: "levelling", count: 800, failures: 2 },
		{ command: "ban", category: "moderation", count: 440, failures: 10 },
	],
	leastUsed: [{ command: "flush", category: "developer", count: 0, failures: 0 }],
	busiestGuilds: [{ guildId: aGuild.id, name: aGuild.name, iconUrl: null, memberCount: 1_234, count: 900 }],
	dashboardGuilds: [{ guildId: aGuild.id, name: aGuild.name, iconUrl: null, memberCount: 1_234, count: 12 }],
	runDays: 30,
	slowest: [
		{ command: "music", category: "music", runs: 40, typicalMs: 850, slowMs: 4_200 },
		{ command: "rank", category: "levelling", runs: 1_300, typicalMs: 90, slowMs: 310 },
	],
	screens: [
		{ route: "/guilds/:guildId/levelling", count: 42 },
		{ route: "/guilds/:guildId/settings", count: 18 },
	],
};

export const guildUsage: GuildUsageReport = {
	guild: {
		guildId: aGuild.id,
		name: aGuild.name,
		iconUrl: null,
		memberCount: 1_234,
		count: 900,
		joinedAt: "2026-01-01T00:00:00.000Z",
	},
	days: 30,
	memberDays: 30,
	runs: 900,
	failures: 9,
	surfaces: { slash: 800, prefix: 100 },
	daily: [
		{ day: "2026-07-31", count: 400, failures: 4 },
		{ day: "2026-08-01", count: 500, failures: 5 },
	],
	commands: [
		{ command: "rank", category: "levelling", count: 600, failures: 1 },
		{ command: "music", category: "music", count: 300, failures: 8 },
	],
	dashboardViews: 12,
	members: 2,
};

export const memberUsage: MemberUsageRow[] = [
	{
		userId: "800000000000000001",
		username: "alice",
		avatarUrl: null,
		runs: 700,
		failures: 3,
		prefix: 50,
		commandCount: 4,
		topCommands: [
			{ command: "rank", count: 500 },
			{ command: "music", count: 150 },
			{ command: "balance", count: 40 },
		],
		lastAt: "2026-08-01T12:00:00.000Z",
	},
	{
		userId: "800000000000000002",
		username: "bob",
		avatarUrl: null,
		runs: 200,
		failures: 0,
		prefix: 0,
		commandCount: 1,
		topCommands: [{ command: "rank", count: 200 }],
		lastAt: "2026-07-31T09:00:00.000Z",
	},
];

export const commandRuns: CommandRunRow[] = [
	{
		at: "2026-08-01T12:00:00.000Z",
		userId: "800000000000000001",
		username: "alice",
		command: "music",
		subcommand: "play",
		surface: "slash",
		failed: true,
		reference: "AB12CD",
		durationMs: 1_200,
		channelId: "400000000000000001",
		channelName: "general",
	},
	{
		at: "2026-08-01T11:00:00.000Z",
		userId: "800000000000000002",
		username: "bob",
		command: "rank",
		subcommand: null,
		surface: "prefix",
		failed: false,
		reference: null,
		durationMs: 85,
		channelId: null,
		channelName: null,
	},
];

const CURRENT_RUN = "6f0d7c1e-2a4b-4c8d-9e1f-0a2b3c4d5e6f";
export const PAST_RUN = "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b";

export const logFeed: LogFeed = {
	run: CURRENT_RUN,
	current: true,
	lines: [
		{
			at: "2026-08-01T12:00:00.000Z",
			level: "error",
			message: "[BAN] Failed to ban member",
			context: { guildId: aGuild.id },
		},
		{ at: "2026-08-01T11:59:00.000Z", level: "info", message: "[READY] Logged in", context: {} },
	],
	buffered: 2,
	capacity: 2_000,
	loggerLevel: "info",
	matched: 2,
};

/** What a crash leaves: a past run with no shutdown, holding the error that ended it with its whole stack. */
export const pastLogFeed: LogFeed = {
	run: PAST_RUN,
	current: false,
	lines: [
		{
			at: "2026-07-30T09:15:00.000Z",
			level: "error",
			message: "[COMMAND_ERROR] A command failed.",
			context: {
				err: {
					name: "DiscordAPIError[50035]",
					message: "Invalid Form Body",
					stack: "DiscordAPIError[50035]: Invalid Form Body\n    at handleErrors (rest.js:762:13)",
					code: 50035,
					cause: { name: "Error", message: "Unknown message", stack: "Error: Unknown message\n    at clear.js:61:5" },
				},
				command: "clear",
			},
		},
	],
	buffered: 140,
	capacity: 2_000,
	loggerLevel: "info",
	matched: 1,
};

export const logRuns: LogRuns = {
	runs: [
		{
			id: CURRENT_RUN,
			startedAt: "2026-08-01T11:58:00.000Z",
			endedAt: null,
			lastAt: "2026-08-01T12:00:00.000Z",
			version: "2.4.1",
			current: true,
			matched: null,
			lines: 2,
			errors: 1,
			warnings: 0,
		},
		{
			id: PAST_RUN,
			startedAt: "2026-07-30T08:00:00.000Z",
			endedAt: null,
			lastAt: "2026-07-30T09:15:00.000Z",
			version: "2.4.0",
			current: false,
			matched: null,
			lines: 140,
			errors: 1,
			warnings: 3,
		},
	],
	kept: 6,
	pastUnavailable: false,
};

export const runtimeInfo: RuntimeInfo = {
	version: "2.0.0",
	nodeVersion: "v24.19.0",
	discordVersion: "14.27.0",
	platform: "linux x64",
	environment: "production",
	startedAt: "2026-07-31T12:00:00.000Z",
	uptimeMs: 90_000_000,
	memoryMb: { heapUsed: 128, heapTotal: 256, rss: 320 },
	repositoryUrl: "https://github.com/Kkkermit/Testify",
	commands: 76,
	events: 16,
	guilds: 3,
	gatewayPingMs: 48,
	shards: 1,
	cachedUsers: 4200,
	cachedChannels: 120,
};
