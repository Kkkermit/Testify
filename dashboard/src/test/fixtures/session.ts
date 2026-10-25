import {
	type BotIdentity,
	type HealthResponse,
	type ManageableGuild,
	type MeResponse,
	type SetupStatus,
} from "@testify/shared";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

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
