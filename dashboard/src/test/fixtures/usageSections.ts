import {
	type AudienceReport,
	type BotActivityReport,
	type FunnelReport,
	type GrowthReport,
	type PanelsReport,
	type ReliabilityReport,
	type RetentionReport,
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
