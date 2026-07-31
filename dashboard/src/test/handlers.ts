import {
	type GuildOverview,
	type HealthResponse,
	type ManageableGuild,
	type MeResponse,
	type SetupStatus,
} from "@testify/shared";
import { http, HttpResponse } from "msw";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

export const healthy: HealthResponse = { ok: true, uptimeMs: 65_000, discord: "ready", database: "connected" };

export const configured: SetupStatus = {
	configured: true,
	missing: [],
	redirectUri: "http://localhost:5173/api/auth/callback",
};

export const aGuild: ManageableGuild = {
	id: "900000000000000001",
	name: "Test Server",
	iconUrl: null,
	memberCount: 1_234,
	botPresent: true,
};

export const withoutBot: ManageableGuild = {
	id: "900000000000000002",
	name: "Somewhere Else",
	iconUrl: null,
	memberCount: null,
	botPresent: false,
};

export const me: MeResponse = {
	user: { id: "100000000000000001", username: "someone", avatarUrl: null },
	isOwner: false,
	guilds: [aGuild, withoutBot],
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

export const handlers = [
	http.get("/api/health", () => HttpResponse.json(healthy)),
	http.get("/api/auth/setup", () => HttpResponse.json(configured)),
	http.get("/api/auth/me", () => HttpResponse.json(me)),
	http.get("/api/guilds/:guildId/overview", () => HttpResponse.json(overview)),
];
