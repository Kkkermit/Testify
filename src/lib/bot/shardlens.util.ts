import { createShardlens, type Shardlens } from "@shardlens/discordjs";
import { BaseInteraction, type Interaction } from "discord.js";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { botVersion } from "@lib/bot/runtime.util";
import { type ShardlensFlush, type ShardlensState, type ShardlensStatus } from "@testify/shared";

/** Shardlens: analytics the bot sends to a collector its owner runs, attached only once it is configured. */

/** The custom events the bot sends beside the interactions the SDK sees for itself, and the reader asks about. */
export const LENS_EVENTS = {
	prefix: "prefix_command",
	prefixFailed: "prefix_command_failed",
	screen: "dashboard_screen",
	server: "dashboard_server",
} as const;

/** Custom events keep no dimensions, so a run's server is also its own property, which is what can be grouped. */
export const serverKey = (guildId: string): string => `in_${guildId}`;

type Runner = (interaction: Interaction, work: () => Promise<unknown>) => Promise<unknown>;

interface Watch {
	run: Runner;
	lastProblem: { name: string; at: number } | null;
}

const watches = new WeakMap<Shardlens, Watch>();

/** The SDK starts its own lines with its name, which the tag already says. */
const said = (message: string): string => `[SHARDLENS] ${message.replace(/^Shardlens:\s*/, "")}`;

export function startShardlens(client: TestifyClient): Shardlens | null {
	const env = client.env;
	if (env.SHARDLENS_URL === undefined && env.SHARDLENS_INGEST_KEY === undefined && !env.SHARDLENS_DRY_RUN) return null;

	const lens = createShardlens(client, {
		endpoint: env.SHARDLENS_URL,
		apiKey: env.SHARDLENS_INGEST_KEY,
		release: botVersion(),
		environment: env.NODE_ENV,
		dryRun: env.SHARDLENS_DRY_RUN,
		// Who ran each interaction is sent only once the collector is in audit mode too; until then it is hashed.
		mode: "audit",
		logger: {
			debug: (message) => client.logger.debug(said(message)),
			info: (message) => client.logger.info(said(message)),
			warn: (message) => client.logger.warn(said(message)),
		},
	});

	const watch: Watch = { run: lens.wrap((_: Interaction, work: () => Promise<unknown>) => work()), lastProblem: null };
	lens.on("error", (name) => {
		watch.lastProblem = { name, at: Date.now() };
	});
	watches.set(lens, watch);
	client.shardlens = lens;
	return lens;
}

/** The start-up line: where it sends, which is never the key. */
export function shardlensLine(env: Env): string {
	if (env.SHARDLENS_DRY_RUN) return "Shardlens dry run — what it would send goes to the log";
	return env.SHARDLENS_URL === undefined ? "Shardlens" : `Shardlens, sending to ${new URL(env.SHARDLENS_URL).origin}`;
}

/** Runs a handler so Shardlens times it and sees it fail; a prefix run is not an interaction, so it just runs. */
export async function measured(client: TestifyClient, interaction: unknown, work: () => Promise<void>): Promise<void> {
	const watch = client.shardlens === null ? undefined : watches.get(client.shardlens);
	if (watch === undefined || !(interaction instanceof BaseInteraction)) return work();
	await watch.run(interaction as Interaction, work);
}

export interface PrefixRun {
	command: string;
	subcommand: string | null;
	ok: boolean;
	durationMs: number;
	userId: string;
	guildId: string | null;
}

/** Slash commands are seen through the gateway, so only a prefix run needs telling; the user id is hashed in the SDK. */
export function recordPrefixRun(client: TestifyClient, run: PrefixRun): void {
	const lens = client.shardlens;
	if (lens === null) return;

	const where = run.guildId === null ? {} : { server: run.guildId, [serverKey(run.guildId)]: run.command };
	const context = { userId: run.userId, guildId: run.guildId };
	lens.track(
		LENS_EVENTS.prefix,
		{
			command: run.command,
			subcommand: run.subcommand,
			outcome: run.ok ? "ok" : "error",
			duration_ms: Math.round(run.durationMs),
			...where,
		},
		context,
	);
	if (!run.ok) lens.track(LENS_EVENTS.prefixFailed, { command: run.command, ...where }, context);
}

/** A dashboard screen by its route pattern, and the server only when one of its managers opened it; never who. */
export function recordScreenView(client: TestifyClient, route: string, managedGuildId: string | null): void {
	const lens = client.shardlens;
	if (lens === null) return;

	lens.track(LENS_EVENTS.screen, { route });
	if (managedGuildId !== null) {
		lens.track(LENS_EVENTS.server, { server: managedGuildId, [serverKey(managedGuildId)]: route });
	}
}

function stateOf(client: TestifyClient, lens: Shardlens): ShardlensState {
	if (client.env.SHARDLENS_DRY_RUN) return "dryRun";
	return lens.stats().ready ? "sending" : "waiting";
}

export function shardlensStatus(client: TestifyClient): ShardlensStatus {
	const lens = client.shardlens;
	const url = client.env.SHARDLENS_URL;
	const collector = url === undefined ? null : new URL(url).origin;

	if (lens === null) {
		return {
			state: "off",
			collector,
			mode: null,
			queued: 0,
			waitingForResponse: 0,
			dropped: 0,
			failedSends: 0,
			lastProblem: null,
		};
	}

	const stats = lens.stats();
	const problem = watches.get(lens)?.lastProblem ?? null;
	return {
		state: stateOf(client, lens),
		collector,
		mode: stats.mode ?? null,
		queued: stats.queueDepth + stats.pendingSalt,
		waitingForResponse: stats.pendingInteractions,
		dropped: Object.values(stats.dropped).reduce((sum, count) => sum + count, 0),
		failedSends: stats.failedFlushes,
		lastProblem: problem === null ? null : { name: problem.name, at: new Date(problem.at).toISOString() },
	};
}

/** Sends what is queued now rather than at the next five-second flush; null while Shardlens is off. */
export async function sendShardlensNow(client: TestifyClient): Promise<ShardlensFlush | null> {
	const lens = client.shardlens;
	if (lens === null) return null;

	const watch = watches.get(lens);
	const before = lens.stats();
	const startedAt = Date.now();
	// An event with a user waits for that user to be hashed, so it would otherwise miss this send.
	await lens.client.idle();
	await lens.flush();
	const after = lens.stats();
	const recent = watch?.lastProblem ?? null;
	const problem =
		recent !== null && recent.at >= startedAt
			? recent.name
			: after.failedFlushes > before.failedFlushes
				? "send"
				: null;

	return {
		sent: problem === null ? Math.max(0, before.queueDepth - after.queueDepth) : 0,
		problem,
		status: shardlensStatus(client),
	};
}
