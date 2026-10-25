import {
	type CommandCatalogue,
	type StatusResponse,
	type SupportArticle,
	type SupportCatalogueEntry,
	type SupportIndex,
	type SupportReply,
} from "@testify/shared";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

const CHECKED_AT = "2026-09-23T12:00:00.000Z";

export const botStatus: StatusResponse = {
	level: "operational",
	version: "2.0.3",
	checkedAt: CHECKED_AT,
	startedAt: "2026-09-21T09:00:00.000Z",
	uptimeMs: 183_600_000,
	paused: false,
	gateway: { level: "operational", pingMs: 42, shards: 1 },
	database: { level: "operational", pingMs: 6 },
	eventLoop: { level: "operational", p50Ms: 10.2, p99Ms: 21.4, maxMs: 40 },
	memory: { level: "operational", heapUsedMb: 120, heapLimitMb: 4_096, rssMb: 260 },
	commands: { level: "operational", runs: 14, failures: 1, p50Ms: 180, p95Ms: 1_240 },
	services: [
		{
			name: "Discord API",
			level: "operational",
			calls: 20,
			failures: 0,
			lastAt: CHECKED_AT,
			lastOk: true,
			latencyMs: null,
		},
		{ name: "reddit", level: "degraded", calls: 4, failures: 1, lastAt: CHECKED_AT, lastOk: true, latencyMs: 310 },
	],
	days: Array.from({ length: 30 }, (_, index) => ({
		day: new Date(Date.UTC(2026, 7, 25 + index)).toISOString().slice(0, 10),
		uptime: index < 27 ? null : index === 28 ? 0.9 : 1,
	})),
	recent: Array.from({ length: 48 }, (_, index) => ({
		start: new Date(Date.UTC(2026, 8, 22, 12, 30) + index * 1_800_000).toISOString(),
		level: index < 10 ? "none" : index === 20 ? "offline" : "operational",
		gatewayPingMs: index < 10 || index === 20 ? null : 40 + index,
	})),
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

function catalogueEntry(
	id: string,
	title: string,
	topic: SupportCatalogueEntry["topic"],
	featured = false,
	keywords: string[] = [],
): SupportCatalogueEntry {
	return { id, title, topic, kind: "article", featured, keywords, questions: [] };
}

export const supportIndex: SupportIndex = {
	articles: [
		catalogueEntry("add-the-bot", "Adding Testify to your server", "getting-started", true, ["invite", "add"]),
		catalogueEntry("levelling", "Setting up levelling", "setup", true, ["xp", "level"]),
		catalogueEntry("tickets", "Setting up tickets", "setup", false, ["ticket panel", "support ticket"]),
		catalogueEntry("role-order", "The bot cannot give or remove a role", "troubleshooting", false, ["role hierarchy"]),
		{ ...catalogueEntry("command-ban", "The /ban command", "commands"), kind: "command" },
	],
};

export const levellingArticle: SupportArticle = {
	id: "levelling",
	title: "Setting up levelling",
	topic: "setup",
	body: "Members earn XP by chatting.\n\n- Run `/levelling setup` in Discord.\n- Or open **Levelling** on the [dashboard](/guilds).\n\n> **Tip:** Nobody loses XP when it is off.",
};

export const supportReply: SupportReply = {
	answer: levellingArticle,
	related: [{ id: "role-order", title: "The bot cannot give or remove a role", topic: "troubleshooting" }],
};
