import { join } from "node:path";
import { type Env } from "@config/env";
import { type LensTarget, type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { repoRoot } from "@core/paths";

/** The Shardlens collector run inside the bot: its database and keys in one folder, its dashboard on this machine. */

export const EMBEDDED_PORT = 8_080;

const AUDIT_KEY_BYTES = 32;

/** One folder per `NODE_ENV`, so a development and a production bot on one machine never share a database. */
export function embeddedDataDir(env: Pick<Env, "NODE_ENV">): string {
	return join(repoRoot(), "shardlens-data", env.NODE_ENV);
}

/** The port asked for, or null for one that is not a port, which then falls back to the default. */
export function embeddedPort(value: string | undefined): number | null {
	if (value === undefined) return EMBEDDED_PORT;
	const port = /^\d{1,5}$/.test(value) ? Number(value) : 0;
	return port >= 1 && port <= 65_535 ? port : null;
}

/** The collector's own rule for its audit key: 32 bytes once read as base64. */
export function isAuditKey(value: string): boolean {
	return Buffer.from(value, "base64").length === AUDIT_KEY_BYTES;
}

/** What to change, for the failures somebody running the bot can fix; null for anything else. */
export function startAdvice(error: unknown, port: number, dataDir: string): string | null {
	const code = (error as { code?: unknown } | null)?.code;
	if (code === "EADDRINUSE") return `Port ${String(port)} is in use: set SHARDLENS_EMBEDDED_PORT to a free one.`;
	if (code === "EACCES" || code === "EPERM" || code === "EROFS") {
		return `The bot cannot write to ${dataDir}: give its user the folder, and on Railway set RAILWAY_RUN_UID=0 with a volume.`;
	}
	return null;
}

/** Starts the collector and points the bot at it; null, with a warning, when it cannot start, and the bot carries on. */
export async function startEmbedded(client: TestifyClient): Promise<LensTarget | null> {
	const { env, logger } = client;
	const dataDir = embeddedDataDir(env);

	let port = embeddedPort(env.SHARDLENS_EMBEDDED_PORT);
	if (port === null) {
		logger.warn(`[SHARDLENS] SHARDLENS_EMBEDDED_PORT is not a port, so the collector uses ${String(EMBEDDED_PORT)}.`);
		port = EMBEDDED_PORT;
	}

	let auditKey = env.SHARDLENS_AUDIT_KEY;
	if (auditKey !== undefined && !isAuditKey(auditKey)) {
		logger.warn(
			"[SHARDLENS] SHARDLENS_AUDIT_KEY is not 32 random bytes in base64 (openssl rand -base64 32), so who ran what stays off.",
		);
		auditKey = undefined;
	}

	try {
		// Loaded only when asked for, so its web server and database stay out of every other install's memory.
		const { startEmbeddedCollector } = await import("@shardlens/collector/embedded");
		const collector = await startEmbeddedCollector({
			dataDir,
			appId: env.DISCORD_CLIENT_ID,
			port,
			...(auditKey === undefined ? {} : { mode: "audit" as const, auditKey }),
		});
		return {
			url: collector.url,
			ingestKey: collector.ingestKey,
			readKey: collector.readKey,
			activityKey: collector.activityKey,
			embedded: { dashboardUrl: collector.dashboardUrl, close: () => collector.close() },
		};
	} catch (error) {
		const advice = startAdvice(error, port, dataDir);
		logger.warn(
			{ err: toError(error) },
			`[SHARDLENS] The collector inside the bot could not start, so analytics are off until the next start.${advice === null ? "" : ` ${advice}`}`,
		);
		return null;
	}
}
