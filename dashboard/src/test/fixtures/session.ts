import {
	type AccountHistory,
	type AccountProfile,
	type AccountReminder,
	type AccountSession,
	type BotIdentity,
	type HealthResponse,
	type ManageableGuild,
	type MeResponse,
	type SetupStatus,
} from "@testify/shared";

export const healthy: HealthResponse = { ok: true, uptimeMs: 65_000, discord: "ready", database: "connected" };

export const configured: SetupStatus = {
	configured: true,
	missing: [],
	redirectUri: "http://localhost:5174/api/auth/callback",
};

export const botProfile: BotIdentity = {
	id: "100000000000000001",
	name: "Testify",
	username: "Testify",
	avatarUrl: "https://cdn.discordapp.com/avatars/1/abc.png",
	bannerUrl: null,
	accentColour: null,
	supportUrl: "https://discord.gg/example",
	repositoryUrl: "https://github.com/Kkkermit/Testify",
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

export const accountHistory: AccountHistory = {
	items: [
		{
			id: "a".repeat(24),
			at: "2026-11-05T10:00:00.000Z",
			guildId: aGuild.id,
			guildName: aGuild.name,
			source: "command",
			summary: "Turned levelling on",
		},
		{
			id: "b".repeat(24),
			at: "2026-11-04T10:00:00.000Z",
			guildId: "900000000000000099",
			guildName: null,
			source: "dashboard",
			summary: "Changed the welcome channel",
		},
	],
	total: 2,
	page: 1,
	perPage: 25,
	servers: [
		{ id: aGuild.id, name: aGuild.name },
		{ id: "900000000000000099", name: null },
	],
};

export const accountReminders: AccountReminder[] = [
	{
		id: "c".repeat(24),
		text: "Feed the cat",
		dueAt: "2099-01-01T09:00:00.000Z",
		deliver: "channel",
		canPing: true,
		guildId: aGuild.id,
		guildName: aGuild.name,
	},
	{
		id: "d".repeat(24),
		text: "Call home",
		dueAt: "2099-01-02T09:00:00.000Z",
		deliver: "dm",
		canPing: false,
		guildId: null,
		guildName: null,
	},
];

export const accountSessions: AccountSession[] = [
	{
		id: "e".repeat(24),
		createdAt: "2026-11-01T10:00:00.000Z",
		lastSeenAt: "2026-11-03T10:00:00.000Z",
		expiresAt: "2026-11-10T10:00:00.000Z",
		current: false,
	},
	{
		id: "f".repeat(24),
		createdAt: "2026-11-05T10:00:00.000Z",
		lastSeenAt: "2026-11-05T10:00:00.000Z",
		expiresAt: "2026-11-12T10:00:00.000Z",
		current: true,
	},
];

export const accountProfile: AccountProfile = {
	about: "I run the music nights.",
	favouriteSong: "Clair de Lune",
	favouriteGame: null,
	hobbies: "Climbing",
	birthday: "1999-04-02",
	updatedAt: "2026-11-01T10:00:00.000Z",
};
