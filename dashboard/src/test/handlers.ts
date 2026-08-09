import {
	type AuditLogConfigResponse,
	type BlacklistRow,
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
	type StickyList,
	type LotterySettings,
	type TicketSettings,
	type TreasureSettings,
	type AutomodRules,
	type BoardPage,
	type MemberDetail,
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

export const automodRules: AutomodRules = {
	canManage: true,
	rules: [
		{
			id: "500000000000000001",
			name: "Block spam",
			enabled: true,
			preset: "spam",
			trigger: "Spam",
			actions: ["block"],
			fromTestify: true,
		},
		{
			id: "500000000000000002",
			name: "Server rules",
			enabled: false,
			preset: null,
			trigger: "Something else",
			actions: ["alert"],
			fromTestify: false,
		},
	],
};

export const lotterySettings: LotterySettings = {
	enabled: true,
	frozen: false,
	entryFee: 100,
	basePrizePool: 500,
	maxWinners: 2,
	frequency: "weekly",
	announcementChannelId: "400000000000000001",
	prizePool: 2500,
	ticketsSold: 20,
	entrants: 7,
	nextDrawAt: "2026-08-14T12:00:00.000Z",
	history: [
		{
			at: "2026-08-07T12:00:00.000Z",
			prizePool: 1800,
			tickets: 12,
			winners: [{ userTag: "kate", prizeAmount: 1800 }],
		},
	],
};

export const economyBoard: BoardPage = {
	board: "economy",
	page: 1,
	pages: 2,
	total: 30,
	rows: [
		{
			userId: "100000000000000001",
			rank: 1,
			displayName: "someone",
			avatarUrl: null,
			primary: 9_400,
			secondary: 6_000,
			inGuild: true,
		},
		{
			userId: "100000000000000002",
			rank: 2,
			displayName: "kate",
			avatarUrl: null,
			primary: 5_120,
			secondary: 120,
			inGuild: true,
		},
		{
			userId: "100000000000000003",
			rank: 3,
			displayName: "Left the server",
			avatarUrl: null,
			primary: 800,
			secondary: 0,
			inGuild: false,
		},
	],
	you: { rank: 1, page: 1 },
};

export const memberDetail: MemberDetail = {
	userId: "100000000000000002",
	displayName: "kate",
	username: "kate",
	avatarUrl: null,
	inGuild: true,
	isBot: false,
	joinedAt: "2026-01-04T00:00:00.000Z",
	roles: [{ id: "300000000000000001", name: "Regulars", colour: "#7c5cff" }],
	economy: { wallet: 5_000, bank: 120, total: 5_120, rank: 2 },
	levels: { level: 12, xp: 4_800, rank: 3 },
	warnings: [
		{
			id: "a1b2c3d4",
			reason: "Spamming in general",
			byId: "100000000000000001",
			byTag: "someone",
			at: "2026-08-01T12:00:00.000Z",
			edited: false,
		},
	],
	softban: null,
	moderationProblem: null,
};

export const ticketSettings: TicketSettings = {
	enabled: true,
	panelChannelId: "400000000000000001",
	categoryId: "400000000000000005",
	transcriptChannelId: "400000000000000002",
	staffRoleId: "300000000000000003",
	description: "Press the button below and we will be with you shortly.",
	buttonLabel: "Create ticket",
	posted: true,
	openTickets: 3,
};

export const treasureSettings: TreasureSettings = {
	enabled: true,
	minMessages: 15,
	maxMessages: 50,
	minAmount: 10,
	maxAmount: 500,
	cooldownMs: 300_000,
	configured: true,
};

export const stickyList: StickyList = {
	limit: 25,
	entries: [
		{ channelId: "400000000000000001", message: "Read the rules", cap: 5, count: 3, posted: true, canSend: true },
	],
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
	{ id: "400000000000000005", name: "Support", kind: "category", position: 4, canSend: false },
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
	http.get("/api/guilds/:guildId/automod", () => HttpResponse.json(automodRules)),
	http.post("/api/guilds/:guildId/automod", () => HttpResponse.json(automodRules)),
	http.patch("/api/guilds/:guildId/automod/:ruleId", () => HttpResponse.json(automodRules)),
	http.delete("/api/guilds/:guildId/automod/:ruleId", () => HttpResponse.json(automodRules)),
	http.get("/api/guilds/:guildId/sticky", () => HttpResponse.json(stickyList)),
	http.get("/api/guilds/:guildId/treasure", () => HttpResponse.json(treasureSettings)),
	http.get("/api/guilds/:guildId/tickets", () => HttpResponse.json(ticketSettings)),
	http.get("/api/guilds/:guildId/members/leaderboard", ({ request }) => {
		const board = new URL(request.url).searchParams.get("board") ?? "economy";
		return HttpResponse.json({ ...economyBoard, board });
	}),
	http.get("/api/guilds/:guildId/members/:userId", () => HttpResponse.json(memberDetail)),
	http.post("/api/guilds/:guildId/members/:userId/warnings", () => HttpResponse.json(memberDetail)),
	http.delete("/api/guilds/:guildId/members/:userId/warnings/:warnId", () => HttpResponse.json(memberDetail)),
	http.delete("/api/guilds/:guildId/members/:userId/warnings", () =>
		HttpResponse.json({ ...memberDetail, warnings: [] }),
	),
	http.patch("/api/guilds/:guildId/members/:userId/level", () => HttpResponse.json(memberDetail)),
	http.patch("/api/guilds/:guildId/members/:userId/money", () => HttpResponse.json(memberDetail)),
	http.delete("/api/guilds/:guildId/members/:userId/softban", () =>
		HttpResponse.json({ ...memberDetail, softban: null }),
	),
	http.get("/api/guilds/:guildId/lottery", () => HttpResponse.json(lotterySettings)),
	http.patch("/api/guilds/:guildId/lottery", () => HttpResponse.json(lotterySettings)),
	http.delete("/api/guilds/:guildId/lottery", () => HttpResponse.json({ ...lotterySettings, enabled: false })),
	http.patch("/api/guilds/:guildId/tickets", () => HttpResponse.json(ticketSettings)),
	http.delete("/api/guilds/:guildId/tickets", () => HttpResponse.json({ ...ticketSettings, enabled: false })),
	http.patch("/api/guilds/:guildId/treasure", () => HttpResponse.json(treasureSettings)),
	http.post("/api/guilds/:guildId/treasure/reset", () => HttpResponse.json(treasureSettings)),
	http.put("/api/guilds/:guildId/sticky", () => HttpResponse.json(stickyList)),
	http.delete("/api/guilds/:guildId/sticky/:channelId", () => HttpResponse.json({ limit: 25, entries: [] })),
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
	http.get("/api/owner/blacklist", () => HttpResponse.json(blacklistRows)),
	http.post("/api/owner/blacklist", () => HttpResponse.json(blacklistRows[0])),
	http.delete("/api/owner/blacklist/:userId", () => HttpResponse.json({ userId: "100000000000000007" })),
	http.post("/api/control/guilds/:guildId/leave", () => HttpResponse.json({ left: aGuild.id })),
];
