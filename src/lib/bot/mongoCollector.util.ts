import { type LensTarget, type TestifyClient } from "@core/client";
import { toError } from "@core/errors";

/** The Shardlens collector run inside the bot, on the bot's own MongoDB, answering the owner console on this machine. */

export const COLLECTOR_PORT = 8_080;

/** Only this machine, so the owner console reads it and nobody else reaches its pages. */
const LOOPBACK = "127.0.0.1";

const AUDIT_KEY_BYTES = 32;

/** MongoDB's code for a database user refused what it asked. */
const UNAUTHORIZED = 13;

/** The port asked for, or null for one that is not a port, which then falls back to the default. */
export function collectorPort(value: string | undefined): number | null {
	if (value === undefined) return COLLECTOR_PORT;
	const port = /^\d{1,5}$/.test(value) ? Number(value) : 0;
	return port >= 1 && port <= 65_535 ? port : null;
}

/** The collector's own rule for its audit key: 32 bytes once read as base64. */
export function isAuditKey(value: string): boolean {
	return Buffer.from(value, "base64").length === AUDIT_KEY_BYTES;
}

/** What to change, for the failures somebody running the bot can fix; null for anything else. */
export function startAdvice(error: unknown): string | null {
	const code = (error as { code?: unknown } | null)?.code;
	if (code === UNAUTHORIZED) {
		return "The database user in MONGODB_URI may not create collections: give it readWrite on the bot's database.";
	}
	return null;
}

/** Starts the collector and points the bot at it; null, with a warning, when it cannot start, and the bot carries on. */
export async function startInBotCollector(client: TestifyClient): Promise<LensTarget | null> {
	const { env, logger } = client;

	let port = collectorPort(env.SHARDLENS_PORT);
	if (port === null) {
		logger.warn(`[SHARDLENS] SHARDLENS_PORT is not a port, so the collector uses ${String(COLLECTOR_PORT)}.`);
		port = COLLECTOR_PORT;
	}

	let auditKey = env.SHARDLENS_AUDIT_KEY;
	if (auditKey !== undefined && !isAuditKey(auditKey)) {
		logger.warn(
			"[SHARDLENS] SHARDLENS_AUDIT_KEY is not 32 random bytes in base64 (openssl rand -base64 32), so who ran what stays off.",
		);
		auditKey = undefined;
	}

	try {
		// Loaded only when asked for, so its web server stays out of every other install's memory.
		const { startMongoCollector } = await import("@shardlens/collector/mongodb");
		const collector = await startMongoCollector({
			uri: env.MONGODB_URI,
			appId: env.DISCORD_CLIENT_ID,
			dashboard: { port, host: LOOPBACK },
			...(auditKey === undefined ? {} : { mode: "audit" as const, auditKey }),
		});

		// A port another process holds leaves the collector storing events but answering no reads.
		const listening = collector.dashboardUrl !== undefined;
		if (!listening) {
			logger.warn(
				`[SHARDLENS] Port ${String(port)} is in use, so analytics are kept but the owner console cannot read them until the next start. Set SHARDLENS_PORT to a free one.`,
			);
		}

		return {
			url: listening ? `http://${LOOPBACK}:${String(port)}` : undefined,
			ingestKey: undefined,
			readKey: collector.readKey,
			activityKey: collector.activityKey,
			inBot: { send: collector.fetch, close: () => collector.close() },
		};
	} catch (error) {
		const advice = startAdvice(error);
		logger.warn(
			{ err: toError(error) },
			`[SHARDLENS] The collector inside the bot could not start, so analytics are off until the next start.${advice === null ? "" : ` ${advice}`}`,
		);
		return null;
	}
}
