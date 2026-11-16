import { createShardlens, type Shardlens } from "@shardlens/discordjs";
import { BaseInteraction, type Interaction, type Message } from "discord.js";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { botVersion } from "@lib/bot/runtime.util";
import { collectorOrigin } from "@lib/bot/shardlensReader.util";
import { type ShardlensFlush, type ShardlensState, type ShardlensStatus } from "@testify/shared";

/** Shardlens: analytics the bot sends to a collector its owner runs, attached only once it is configured. */

/** The dashboard's own custom events; commands on both surfaces are the SDK's to record. */
export const LENS_EVENTS = {
	screen: "dashboard_screen",
	server: "dashboard_server",
} as const;

/** Custom events keep no dimensions, so a view's server is also its own property, which is what can be grouped. */
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
	if (env.SHARDLENS_URL === undefined && env.SHARDLENS_INGEST_KEY === undefined) return null;

	const lens = createShardlens(client, {
		endpoint: env.SHARDLENS_URL,
		apiKey: env.SHARDLENS_INGEST_KEY,
		release: botVersion(),
		environment: env.NODE_ENV,
		// Who ran each command is sent only once the collector is in audit mode too; until then it is hashed.
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
	const origin = collectorOrigin(env.SHARDLENS_URL);
	return origin === null ? "Shardlens" : `Shardlens, sending to ${origin}`;
}

/** Runs a handler so Shardlens times it and sees it fail; a prefix run is told once it is over, by `recordPrefixRun`. */
export async function measured(client: TestifyClient, interaction: unknown, work: () => Promise<void>): Promise<void> {
	const watch = client.shardlens === null ? undefined : watches.get(client.shardlens);
	if (watch === undefined || !(interaction instanceof BaseInteraction)) return work();
	await watch.run(interaction as Interaction, work);
}

export interface PrefixRun {
	/** The command's own name, after aliases, never what was typed. */
	command: string;
	subcommand: string | null;
	durationMs: number;
	ok: boolean;
	/** What the command threw, of which the SDK keeps only the class and Discord's code. */
	error: unknown;
}

/** A prefix run is a message, which the SDK never reads, so the bot names the command it matched once it has run. */
export function recordPrefixRun(client: TestifyClient, message: Message, run: PrefixRun): void {
	client.shardlens?.trackMessageCommand(message, {
		command: run.command,
		...(run.subcommand === null ? {} : { sub: run.subcommand }),
		durationMs: run.durationMs,
		failed: !run.ok,
		...(run.error === undefined ? {} : { error: run.error }),
	});
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

const stateOf = (lens: Shardlens): ShardlensState => (lens.stats().ready ? "sending" : "waiting");

export function shardlensStatus(client: TestifyClient): ShardlensStatus {
	const lens = client.shardlens;
	const collector = collectorOrigin(client.env.SHARDLENS_URL);

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
		state: stateOf(lens),
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
	const startedAt = Date.now();
	// An event with a user waits for that user to be hashed, so it would otherwise miss this send.
	await lens.client.idle();
	const before = lens.stats();
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
