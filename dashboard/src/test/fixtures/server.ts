import {
	type ChannelSummary,
	type CommandToggleState,
	type GuildInbox,
	type GuildNickname,
	type GuildOverview,
	type GuildPlaces,
	type InsightsReport,
	type RoleSummary,
	type ServerSettings,
	type SetupChecklist,
	type VerificationConfigResponse,
} from "@testify/shared";
import { aGuild } from "@/test/fixtures/session";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

export const overview: GuildOverview = {
	id: aGuild.id,
	name: aGuild.name,
	iconUrl: null,
	memberCount: 1_234,
	channelCount: 20,
	roleCount: 8,
	features: [
		{ key: "levelling", label: "Levelling", enabled: true, detail: { kind: "levelling", rewards: 2, boosts: 1 } },
		{ key: "welcome", label: "Welcome messages", enabled: false, detail: null },
	],
	missingPermissions: [],
	recentChanges: [],
};

/** Everything done, so the checklist stays out of the way of tests about something else. */
export const setupDone: SetupChecklist = {
	steps: [
		{ step: "levelling", done: true, channelId: null, channelName: null, createsChannel: false, blocker: null },
		{ step: "welcome", done: true, channelId: null, channelName: null, createsChannel: false, blocker: null },
		{ step: "audit-log", done: true, channelId: null, channelName: null, createsChannel: false, blocker: null },
	],
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

export const guildNickname: GuildNickname = { nickname: "Testy", canChange: true };

export const commandToggles: CommandToggleState = {
	disabled: ["ban"],
	disabledGlobally: [],
	locked: ["help"],
};

export const someChannels: ChannelSummary[] = [
	{ id: "400000000000000001", name: "general", kind: "text", position: 1, parentId: null, canSend: true },
	{
		id: "400000000000000002",
		name: "locked",
		kind: "text",
		position: 2,
		parentId: "400000000000000005",
		canSend: false,
	},
	{ id: "400000000000000003", name: "Voice", kind: "voice", position: 3, parentId: null, canSend: false },
	{ id: "400000000000000005", name: "Support", kind: "category", position: 4, parentId: null, canSend: false },
];

export const someRoles: RoleSummary[] = [
	{
		id: "300000000000000001",
		name: "Member",
		colour: null,
		position: 1,
		managed: false,
		assignableByBot: true,
		powerful: false,
	},
	{
		id: "300000000000000002",
		name: "Booster",
		colour: "#7c3aed",
		position: 3,
		managed: false,
		assignableByBot: true,
		powerful: false,
	},
	{
		id: "300000000000000003",
		name: "Admin",
		colour: null,
		position: 9,
		managed: false,
		assignableByBot: false,
		powerful: true,
	},
];

export const insightsReport: InsightsReport = {
	days: 7,
	server: {
		createdAt: "2020-01-01T00:00:00.000Z",
		ownerId: "100000000000000001",
		ownerName: "kermit",
		members: 1234,
		people: 1187,
		bots: 47,
		textChannels: 12,
		voiceChannels: 4,
		categories: 3,
		roles: 9,
		emojis: 20,
		stickers: 2,
		boostTier: 1,
		boosts: 3,
		verification: "medium",
	},
	countingSince: "2026-09-21",
	totals: { messages: 70, activeMembers: 5, joins: 3, leaves: 1 },
	daily: Array.from({ length: 7 }, (_, index) => ({
		day: `2026-09-${String(21 + index)}`,
		messages: 10,
		joins: index === 6 ? 3 : 0,
		leaves: index === 6 ? 1 : 0,
	})),
	hours: Array.from({ length: 24 }, (_, hour) => (hour === 20 ? 30 : hour === 9 ? 10 : 0)),
	topChannels: [
		{ channelId: "400000000000000001", name: "general", messages: 50 },
		{ channelId: "400000000000000009", name: null, messages: 5 },
	],
	topMembers: [{ userId: "100000000000000002", name: "kate", avatarUrl: null, messages: 40 }],
	recentJoins: [{ userId: "100000000000000002", name: "kate", at: "2026-09-27T10:00:00.000Z" }],
	recentLeaves: [],
};

/** Welcome posts in #general, tickets keep their panel and logs in #locked, goodbye waits, levelling is server-wide. */
export const guildPlaces: GuildPlaces = {
	features: [
		{
			key: "levelling",
			label: "Levelling",
			enabled: true,
			detail: { kind: "levelling", rewards: 2, boosts: 1 },
			reach: "everywhere",
			places: [],
		},
		{
			key: "welcome",
			label: "Welcome messages",
			enabled: true,
			detail: { kind: "posting", channelId: "400000000000000001" },
			reach: "channel",
			places: [{ channelId: "400000000000000001", role: "posts" }],
		},
		{
			key: "goodbye",
			label: "Goodbye messages",
			enabled: false,
			detail: null,
			reach: "channel",
			places: [],
		},
		{
			key: "tickets",
			label: "Tickets",
			enabled: true,
			detail: { kind: "count", what: "ticketsOpen", count: 3 },
			reach: "channel",
			places: [
				{ channelId: "400000000000000002", role: "panel" },
				{ channelId: "400000000000000002", role: "logs" },
			],
		},
	],
};

/** Nothing waiting, so a screen that is not about the inbox draws no count and no overview line. */
export const quietInbox: GuildInbox = {
	tickets: { total: 0, items: [] },
	ideas: { total: 0, items: [] },
	permissions: [],
	channels: [],
};

/** One ticket of three shown, one idea, a missing permission and a log channel the bot cannot post in. */
export const busyInbox: GuildInbox = {
	tickets: {
		total: 3,
		items: [
			{ channelId: "700000000000000010", ticketId: "12", ownerName: "kate", openedAt: "2026-09-27T10:00:00.000Z" },
		],
	},
	ideas: {
		total: 1,
		items: [
			{
				id: "idea-1",
				number: 4,
				text: "A music quiz night",
				authorName: "kate",
				up: 5,
				down: 1,
				createdAt: "2026-09-26T10:00:00.000Z",
			},
		],
	},
	permissions: ["ManageRoles"],
	channels: [
		{ feature: "audit-logging", label: "Audit logging", channelId: "400000000000000002", problem: "cannotPost" },
	],
};
