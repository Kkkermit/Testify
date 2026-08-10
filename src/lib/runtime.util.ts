import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { version as discordVersion } from "discord.js";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { repoRoot } from "@core/paths";
import { type RuntimeInfo } from "@testify/shared";

/** What the bot is running as, for the owner console's runtime card. */

const UNKNOWN = "unknown";

/** Read once: the file cannot change under a running process, and this is on a polled endpoint. */
let cachedVersion: string | null = null;

export function botVersion(): string {
	if (cachedVersion !== null) return cachedVersion;

	try {
		const raw = readFileSync(resolve(repoRoot(), "package.json"), "utf8");
		const parsed = JSON.parse(raw) as { version?: unknown };
		cachedVersion = typeof parsed.version === "string" ? parsed.version : UNKNOWN;
	} catch {
		// A missing or unreadable package.json is not worth failing an endpoint over.
		cachedVersion = UNKNOWN;
	}

	return cachedVersion;
}

const MB = 1024 * 1024;

export function runtimeInfo(client: TestifyClient, now = Date.now()): RuntimeInfo {
	const memory = process.memoryUsage();

	return {
		version: botVersion(),
		nodeVersion: process.version,
		discordVersion,
		platform: `${process.platform} ${process.arch}`,
		environment: client.env.NODE_ENV,
		startedAt: new Date(client.startedAt).toISOString(),
		uptimeMs: now - client.startedAt,
		memoryMb: {
			heapUsed: Math.round(memory.heapUsed / MB),
			heapTotal: Math.round(memory.heapTotal / MB),
			rss: Math.round(memory.rss / MB),
		},
		// Linked rather than checked: a bot that calls home on a timer is not something to ship by default.
		repositoryUrl: theme.repository,
		commands: client.commands.size,
		events: client.eventNames().length,
		guilds: client.guilds.cache.size,
		// -1 until the first heartbeat comes back, which is what discord.js reports before the gateway settles.
		gatewayPingMs: Math.round(client.ws.ping),
		shards: client.ws.shards.size,
		cachedUsers: client.users.cache.size,
		cachedChannels: client.channels.cache.size,
	};
}
