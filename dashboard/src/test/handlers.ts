import {
	type AuditLogConfigResponse,
	type BotControlState,
	type BotIdentity,
	type OwnerGuildDetail,
	type ChannelSummary,
	type CommandCatalogue,
	type CommandToggleState,
	type LogFeed,
	type RuntimeInfo,
	type ServerSettings,
	type UsageReport,
	type VerificationConfigResponse,
	type GuildNickname,
	type GuildOverview,
	type LevelConfigResponse,
	type HealthResponse,
	type ManageableGuild,
	type MeResponse,
	type RoleSummary,
	type SetupStatus,
	type WelcomeConfigResponse,
} from "@testify/shared";
import { http, HttpResponse } from "msw";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

export const healthy: HealthResponse = { ok: true, uptimeMs: 65_000, discord: "ready", database: "connected" };

export const configured: SetupStatus = {
	configured: true,
	missing: [],
	redirectUri: "http://localhost:5174/api/auth/callback",
};

export const botProfile: BotIdentity = {
	id: "100000000000000001",
	username: "Testify",
	avatarUrl: "https://cdn.discordapp.com/avatars/1/abc.png",
	bannerUrl: null,
	accentColour: null,
};

export const aGuild: ManageableGuild = {
	id: "900000000000000001",
	name: "Test Server",
	iconUrl: null,
	memberCount: 1_234,
	botPresent: true,
	canInvite: true,
};

export const withoutBot: ManageableGuild = {
	id: "900000000000000002",
	name: "Somewhere Else",
	iconUrl: null,
	memberCount: null,
	botPresent: false,
	canInvite: true,
};

export const cannotAdd: ManageableGuild = {
	id: "900000000000000003",
	name: "Someone Else's Server",
	iconUrl: null,
	memberCount: null,
	botPresent: false,
	canInvite: false,
};

export const me: MeResponse = {
	user: { id: "100000000000000001", username: "someone", avatarUrl: null },
	isOwner: false,
	guilds: [aGuild, withoutBot, cannotAdd],
};

export const overview: GuildOverview = {
	id: aGuild.id,
	name: aGuild.name,
	iconUrl: null,
	memberCount: 1_234,
	channelCount: 20,
	roleCount: 8,
	features: [
		{ key: "levelling", label: "Levelling", enabled: true, detail: "2 role rewards, 1 boost" },
		{ key: "welcome", label: "Welcome messages", enabled: false, detail: null },
	],
	missingPermissions: [],
	recentChanges: [],
};

export const levelConfig: LevelConfigResponse = {
	enabled: true,
	boosts: [{ roleId: "300000000000000002", multiplier: 2 }],
	rewards: [{ level: 5, roleId: "300000000000000001" }],
	stackRewards: true,
	levelUpChannelId: null,
	announce: true,
	ignoredChannelIds: [],
	ignoredRoleIds: [],
};

export const welcomeConfig: WelcomeConfigResponse = {
	enabled: true,
	channelId: "400000000000000001",
	message: "Welcome to **{server}**, {user}! You are member **{count}**.",
	style: "card",
	hasBackground: false,
};

export const auditLogConfig: AuditLogConfigResponse = {
	enabled: true,
	channelId: "400000000000000001",
	events: ["messageDelete", "banAdd"],
	all: false,
};

export const serverSettings: ServerSettings = {
	prefix: { prefix: "t?", enabled: true },
	antiLink: { enabled: false, bypassPermission: "ManageMessages" },
	autoRoles: { roleIds: ["300000000000000001"] },
	counting: { enabled: true, channelId: "400000000000000001", maxCount: 1_000, count: 412 },
	voiceStats: { memberChannelId: null, botChannelId: null },
};

export const verificationConfig: VerificationConfigResponse = {
	enabled: true,
	channelId: "400000000000000001",
	roleId: "300000000000000001",
	message: "Press the button below to verify yourself.",
	posted: true,
	verifiedCount: 42,
	roleTooHigh: false,
};

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
	missingPermissions: ["Manage Roles"],
	configured: ["levelling"],
	usage: 900,
};

export const guildNickname: GuildNickname = { nickname: "Testy", canChange: true };

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
};

export const logFeed: LogFeed = {
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
	capacity: 1_000,
	loggerLevel: "info",
	matched: 2,
};

export const runtimeInfo: RuntimeInfo = {
	version: "2.0.0",
	nodeVersion: "v22.22.2",
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
};

export const catalogue: CommandCatalogue = {
	prefix: "t?",
	categories: ["info", "moderation"],
	commands: [
		{
			name: "ban",
			description: "Bans a member.",
			category: "moderation",
			aliases: ["b"],
			subcommands: [],
			options: [{ name: "user", description: "Who.", type: "user", required: true, choices: [], min: null, max: null }],
			permissions: ["ban members"],
			botPermissions: [],
			cooldownMs: null,
			guildOnly: true,
			ownerOnly: false,
			nsfw: false,
		},
		{
			name: "levelling",
			description: "Sets up levelling.",
			category: "info",
			aliases: [],
			subcommands: [{ name: "setup", description: "Opens the panel.", aliases: [], options: [] }],
			options: [],
			permissions: [],
			botPermissions: [],
			cooldownMs: null,
			guildOnly: true,
			ownerOnly: false,
			nsfw: false,
		},
	],
};

export const commandToggles: CommandToggleState = {
	disabled: ["ban"],
	disabledGlobally: [],
	locked: ["help"],
};

export const someChannels: ChannelSummary[] = [
	{ id: "400000000000000001", name: "general", kind: "text", position: 1, canSend: true },
	{ id: "400000000000000002", name: "locked", kind: "text", position: 2, canSend: false },
	{ id: "400000000000000003", name: "Voice", kind: "voice", position: 3, canSend: false },
];

export const someRoles: RoleSummary[] = [
	{ id: "300000000000000001", name: "Member", colour: null, position: 1, managed: false, assignableByBot: true },
	{ id: "300000000000000002", name: "Booster", colour: "#7c3aed", position: 3, managed: false, assignableByBot: true },
	{ id: "300000000000000003", name: "Admin", colour: null, position: 9, managed: false, assignableByBot: false },
];

export const handlers = [
	http.get("/api/health", () => HttpResponse.json(healthy)),
	http.get("/api/auth/setup", () => HttpResponse.json(configured)),
	http.get("/api/bot", () => HttpResponse.json(botProfile)),
	http.get("/api/commands", () => HttpResponse.json(catalogue)),
	http.get("/api/auth/me", () => HttpResponse.json(me)),
	http.get("/api/guilds/:guildId/overview", () => HttpResponse.json(overview)),
	http.get("/api/guilds/:guildId/levelling", () => HttpResponse.json(levelConfig)),
	http.get("/api/guilds/:guildId/welcome", () => HttpResponse.json(welcomeConfig)),
	http.get("/api/guilds/:guildId/audit-log", () => HttpResponse.json(auditLogConfig)),
	http.get("/api/guilds/:guildId/settings", () => HttpResponse.json(serverSettings)),
	http.get("/api/guilds/:guildId/settings/nickname", () => HttpResponse.json(guildNickname)),
	http.get("/api/guilds/:guildId/channels", () => HttpResponse.json(someChannels)),
	http.get("/api/guilds/:guildId/roles", () => HttpResponse.json(someRoles)),
	http.get("/api/guilds/:guildId/verification", () => HttpResponse.json(verificationConfig)),
	http.get("/api/guilds/:guildId/commands", () => HttpResponse.json(commandToggles)),
	http.get("/api/owner/commands", () => HttpResponse.json(commandToggles)),
	http.get("/api/analytics/usage", () => HttpResponse.json(usageReport)),
	http.get("/api/analytics/logs", () => HttpResponse.json(logFeed)),
	http.get("/api/analytics/runtime", () => HttpResponse.json(runtimeInfo)),
	http.get("/api/control", () => HttpResponse.json(botControl)),
	http.get("/api/control/guilds/:guildId", () => HttpResponse.json(guildDetail)),
	http.get("/api/owner/stats", () =>
		HttpResponse.json({
			guilds: 3,
			users: 4_200,
			uptimeMs: 90_000_000,
			memoryMb: 128,
			commands: 76,
			database: "connected",
		}),
	),
	http.get("/api/owner/guilds", () => HttpResponse.json({ items: [], total: 0, page: 1, perPage: 25 })),
];
