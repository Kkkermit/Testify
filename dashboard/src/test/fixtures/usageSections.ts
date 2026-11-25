import {
	type AudienceReport,
	type BotActivityReport,
	type CollectorSetup,
	type CommandReport,
	type FunnelReport,
	type GrowthReport,
	type LiveRead,
	type PanelsReport,
	type ReliabilityReport,
	type RetentionReport,
	type RunsPage,
	type TopRunners,
} from "@testify/shared";

const week = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"];

export const audience: AudienceReport = {
	days: 30,
	daily: week.map((day, index) => ({ day, users: 10 + index, newUsers: index === 6 ? 3 : 0 })),
	stickiness: 0.25,
	userLanguages: [
		{ key: "de", count: 40 },
		{ key: "pt-BR", count: 12 },
	],
	serverLanguages: [{ key: "en-GB", count: 3 }],
	tiers: [
		{ key: "member", count: 90 },
		{ key: "admin", count: 10 },
	],
	contexts: [{ key: "0", count: 100 }],
	hours: { timezone: "Europe/London", cells: [{ weekday: 1, hour: 20, count: 42 }] },
	weekly: [
		{ week: "2026-07-27", users: 30 },
		{ week: "2026-08-03", users: 41 },
	],
	periods: [
		{ period: "2026-07-01", users: 120, final: true },
		{ period: "2026-08-01", users: 64, final: false },
	],
	installs: [
		{ key: "guild", count: 95 },
		{ key: "user", count: 5 },
	],
};

export const growth: GrowthReport = {
	days: 30,
	daily: week.map((day, index) => ({ day, joins: index % 2, leaves: index === 3 ? 1 : 0 })),
	joins: 3,
	leaves: 1,
	activation: { joined: 3, activated: 2, rate: 2 / 3 },
	installs: { active: 12, inactive: 4 },
	sizeAtInstall: [{ key: "11-100", count: 3 }],
	lifetimes: [{ key: "<1d", count: 1 }],
	serverCount: { ours: 12, discord: 14, warn: true },
	detected: { joins: 1, leaves: 0 },
	discordCount: week.map((day, index) => ({ day, value: index === 2 ? null : 14 })),
	cohorts: [{ cohort: "2026-07-27", weeks: [3, 2, 1] }],
	installsFromDiscord: {
		webhookStatus: 1,
		daily: week.map((day, index) => ({ day, serverInstalls: index % 2, userInstalls: 0, userRemovals: 0 })),
		scopes: [{ key: "applications.commands", count: 3 }],
	},
};

export const panels: PanelsReport = {
	days: 30,
	buttons: [
		{
			id: "shop",
			presses: 120,
			failures: 2,
			actions: [
				{ key: "buy", count: 80 },
				{ key: "open", count: 40 },
			],
		},
	],
	forms: [{ id: "deletemydata", shown: 10, submitted: 4 }],
};

export const activity: BotActivityReport = {
	days: 30,
	detailDays: 7,
	music: {
		played: 50,
		skipped: 4,
		refused: 9,
		sources: [{ key: "youtube", count: 50 }],
		causes: [{ source: "youtube", reason: "bot-check", count: 9 }],
	},
	support: {
		answered: 20,
		refused: 5,
		answeredBy: [{ key: "search", count: 20 }],
		refusedBy: [{ key: "model", count: 5 }],
		articles: [{ key: "levelling-setup", count: 8 }],
	},
	refusals: { total: 6, reasons: [{ key: "cooldown", count: 6 }], commands: [{ key: "work", count: 6 }] },
	automatic: [
		{ action: "auto_reply", count: 0 },
		{ action: "level_up", count: 31 },
	],
	changes: {
		total: 4,
		screens: [{ key: "/guilds/:guildId/welcome", count: 4 }],
		ways: [{ key: "put_back", count: 1 }],
	},
	events: [
		{ name: "level_up", count: 31, people: 0, lastAt: "2026-08-07T10:00:00.000Z" },
		{ name: "dashboard_screen", count: 12, people: 0, lastAt: "2026-08-07T11:00:00.000Z" },
	],
};

export const reliability: ReliabilityReport = {
	days: 30,
	daily: week.map((day) => ({ day, runs: 100, errors: 1, late: 0 })),
	totals: {
		runs: 700,
		missedDeadlines: 3,
		noResponse: 1,
		errors: 7,
		over3sRate: 0.01,
		p50Ms: 120,
		p95Ms: 900,
		p99Ms: 2_000,
	},
	from: "2026-08-01T00:00:00.000Z",
	errorsByCode: [{ key: "50013", count: 5 }],
	rateLimits: { daily: week.map((day) => ({ day, count: 0 })), routes: [] },
	shards: {
		now: [{ shard: 0, pingMs: 88, stale: false }],
		daily: week.map((day) => ({ day, pingMs: 90 })),
		events: [{ at: "2026-08-05T10:00:00.000Z", shard: 0, state: "resumed", closeCode: 4000 }],
	},
	rest: [{ method: "POST", route: "/channels/:id/messages", calls: 420, failures: 3, retries: 1, p95Ms: 210 }],
	invalidRequests: { used: 12, limit: 10_000, share: 0.0012 },
	sessions: { remaining: 998, total: 1_000 },
	process: {
		memory: week.map((day) => ({ day, value: 180_000_000, max: 210_000_000 })),
		eventLoop: week.map((day) => ({ day, value: 12, max: 48 })),
	},
	bursts: [{ minute: "2026-08-06T19:04:00.000Z", runs: 60, median: 4 }],
};

export const commandReport: CommandReport = {
	command: "warn",
	category: "moderation",
	days: 30,
	from: "2026-08-01T00:00:00.000Z",
	daily: week.map((day, index) => ({ day, count: 10 + index, failures: index === 4 ? 1 : 0 })),
	totals: {
		runs: 91,
		ok: 88,
		errors: 1,
		late: 2,
		noResponse: 0,
		deferRate: 0.4,
		ephemeralRate: 0.9,
		over3sRate: 0.02,
		handlerP95Ms: 640,
		firstAt: "2026-08-01T09:00:00.000Z",
		lastAt: "2026-08-07T11:30:00.000Z",
	},
	latency: Array.from({ length: 40 }, (_, index) => (index === 20 ? 50 : index === 25 ? 30 : 0)),
	kinds: [
		{ key: "chat_input", count: 80 },
		{ key: "message_command", count: 11 },
	],
	subcommands: [{ key: "create", count: 70 }],
	options: [{ key: "reason", count: 60 }],
	optionValues: [{ option: "duration", value: "1h", runs: 12 }],
	tiers: [{ key: "manager", count: 91 }],
	installs: [{ key: "guild", count: 91 }],
	contexts: [{ key: "0", count: 91 }],
	channelTypes: [{ key: "0", count: 91 }],
	locales: [{ key: "en-GB", count: 91 }],
	servers: [{ guildId: "900000000000000001", name: "Testify HQ", iconUrl: null, memberCount: 1_204, count: 91 }],
	components: [{ handler: "warnform:submit", kind: "modal_submit", count: 5 }],
	forms: [{ id: "warnform", shown: 9, submitted: 5 }],
	collector: "https://stats.example.com",
};

export const collectorSetup: CollectorSetup = {
	collector: "https://stats.example.com",
	inBot: false,
	app: {
		name: "Testify",
		mode: "privacy",
		saltPeriod: "month",
		timezone: "Europe/London",
		rawRetentionDays: 30,
		discordLogin: true,
	},
	checks: {
		receivingEvents: true,
		appInfoReceived: true,
		webhookEventsEnabled: false,
		requiredPermissionsSet: true,
		auditMode: false,
		auditKey: true,
		activityKey: true,
	},
	lastEventAt: "2026-08-07T11:59:00.000Z",
	servers: 12,
	people: 140,
	bot: {
		at: "2026-08-07T11:00:00.000Z",
		approxServers: 14,
		approxUserInstalls: 3,
		sessionsLeft: 998,
		sessionsTotal: 1_000,
		nodeVersion: "24.11.0",
		libraryVersion: "14.24.2",
		sdkVersion: "1.1.0",
		release: "2.4.6",
	},
	instances: [
		{
			instance: "0190f1a2-0000-7000-8000-00000000000a",
			at: "2026-08-07T11:59:00.000Z",
			shards: [0],
			queued: 3,
			dropped: 0,
			failedSends: 1,
			internalErrors: 0,
			sdkVersion: "1.1.0",
		},
	],
};

export const funnel: FunnelReport = {
	days: 30,
	hours: 24,
	steps: [
		{ command: "ban", users: 10, medianSeconds: null },
		{ command: "levelling", users: 4, medianSeconds: 90 },
	],
};

export const retention: RetentionReport = {
	days: 30,
	interval: "week",
	start: "ban",
	back: null,
	periods: 8,
	cohorts: [{ cohort: "2026-08-03", size: 10, retained: [5, 2, 0, 0, 0, 0, 0, 0] }],
};

export const liveRead: LiveRead = {
	numbers: {
		at: "2026-08-07T12:00:00.000Z",
		perMinute: 18,
		failed15m: 2,
		perSecond: [0, 1, 0, 2, 0, 0, 1],
		slowMs: 840,
		shards: [
			{ shard: 0, pingMs: 41, fresh: true },
			{ shard: 1, pingMs: 0, fresh: false },
		],
		servers: 12,
	},
	problem: null,
};

/** One row carries text a person chose that looks like markup, which must arrive as text. */
export const runsPage: RunsPage = {
	rows: [
		{
			id: "0190f1a2-0000-7000-8000-000000000001",
			at: "2026-08-07T11:58:00.000Z",
			guildId: "900000000000000001",
			guildName: "Testify HQ",
			kind: "chat_input",
			command: "warn",
			sub: "create",
			handler: null,
			outcome: "error",
			answerMs: 3_400,
			userId: "100000000000000002",
			username: "<img src=x onerror=alert(1)>",
			avatarUrl: null,
		},
		{
			id: "0190f1a2-0000-7000-8000-000000000002",
			at: "2026-08-07T11:57:00.000Z",
			guildId: null,
			guildName: null,
			kind: "button",
			command: null,
			sub: null,
			handler: "shop:buy",
			outcome: "ok",
			answerMs: 90,
			userId: null,
			username: null,
			avatarUrl: null,
		},
	],
	next: "2026-08-07T11:57:00.000Z~0190f1a2-0000-7000-8000-000000000002",
	collector: "https://stats.example.com",
};

export const topRunners: TopRunners = {
	window: "24h",
	rows: [
		{ userId: "100000000000000002", username: "maple.fox", avatarUrl: null, runs: 40 },
		{ userId: null, username: null, avatarUrl: null, runs: 3 },
	],
};
