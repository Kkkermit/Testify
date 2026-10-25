import {
	type AuditLogConfigResponse,
	type AutomodRules,
	type CasePage,
	type CaseSettings,
	type GuildWarningsPage,
	type MemberDetail,
	type MemberMatch,
	type RaidOverview,
	type ServerChangesPage,
	type WarnLadder,
	type WarningAdded,
} from "@testify/shared";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

export const auditLogConfig: AuditLogConfigResponse = {
	enabled: true,
	channelId: "400000000000000001",
	events: ["messageDelete", "banAdd"],
	all: false,
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
			fromBot: true,
		},
		{
			id: "500000000000000002",
			name: "Server rules",
			enabled: false,
			preset: null,
			trigger: "Something else",
			actions: ["alert"],
			fromBot: false,
		},
	],
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
			step: { action: "timeout", minutes: 10 },
			stepProblem: null,
		},
	],
	softban: null,
	moderationProblem: null,
};

export const warnLadder: WarnLadder = {
	steps: [{ action: "warn" }, { action: "timeout", minutes: 10 }, { action: "kick" }, { action: "ban" }],
};

export const guildWarnings: GuildWarningsPage = {
	items: [
		{
			id: "a1b2c3d4",
			userId: "100000000000000002",
			username: "kate",
			reason: "Spamming in general",
			byId: "100000000000000001",
			byTag: "someone",
			at: "2026-08-01T12:00:00.000Z",
			edited: false,
			step: { action: "timeout", minutes: 10 },
			stepProblem: null,
		},
	],
	total: 1,
	page: 1,
	perPage: 20,
};

export const warningAdded: WarningAdded = {
	warning: guildWarnings.items[0]!,
	outcome: { count: 2, step: { action: "timeout", minutes: 10 }, problem: null },
};

export const memberMatches: MemberMatch[] = [
	{ userId: "100000000000000002", displayName: "kate", username: "kate", avatarUrl: null },
];

export const serverChanges: ServerChangesPage = {
	items: [
		{
			id: "a1",
			source: "discord",
			at: "2026-09-27T11:00:00.000Z",
			actorId: "100000000000000002",
			actorTag: "mod",
			kind: "member",
			verb: "banned",
			summary: null,
			target: "marcus",
			reason: "Spamming invites",
		},
		{
			id: "d1",
			source: "dashboard",
			at: "2026-09-27T10:00:00.000Z",
			actorId: "100000000000000001",
			actorTag: "kate",
			kind: "settings",
			verb: "updated",
			summary: "Turned levelling on",
			target: null,
			reason: null,
		},
	],
	total: 2,
	page: 1,
	perPage: 25,
	discordReadable: true,
	truncated: false,
};

export const caseSettings: CaseSettings = { logChannelId: "400000000000000001", canSend: true };

export const raidOverview: RaidOverview = {
	enabled: true,
	alertChannelId: "400000000000000001",
	pingRoleId: null,
	minAccountAgeDays: 7,
	spikeJoins: 10,
	spikeMinutes: 1,
	canSend: true,
	canHold: true,
	canPing: true,
};

export const casePage: CasePage = {
	items: [
		{
			number: 2,
			action: "softban",
			userId: "100000000000000002",
			username: "kit",
			moderatorId: "100000000000000001",
			moderatorName: "sam",
			reason: "Raiding",
			durationMs: 7 * 24 * 60 * 60 * 1_000,
			at: "2026-10-24T18:00:00.000Z",
		},
		{
			number: null,
			action: "warn",
			userId: "100000000000000003",
			username: "ada",
			moderatorId: "100000000000000001",
			moderatorName: "sam",
			reason: "Spam",
			durationMs: null,
			at: "2026-01-02T09:00:00.000Z",
		},
	],
	total: 2,
	page: 1,
	perPage: 10,
};
