import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createShardlens, type Shardlens } from "@shardlens/discordjs";
import { BaseInteraction, type Interaction, type Message } from "discord.js";
import { type LensTarget, type TestifyClient } from "@core/client";
import { type Command, type GivenOption, subcommandsOf } from "@core/command";
import { toError } from "@core/errors";
import { readOptOuts } from "@database/repositories/analyticsOptOutRepository";
import { startEmbedded } from "@lib/bot/embeddedCollector.util";
import { botVersion } from "@lib/bot/runtime.util";
import { collectorOrigin } from "@lib/bot/shardlensReader.util";
import {
	type AutomaticAction,
	type ChangeWay,
	type MusicReason,
	type RefusalReason,
	type ShardlensFlush,
	type ShardlensState,
	type ShardlensStatus,
	type SupportWay,
} from "@testify/shared";

/** Shardlens: analytics the bot sends to a collector its owner runs, attached only once it is configured. */

/** One name per thing counted, so each keeps its own total; commands on both surfaces are the SDK's own. */
export const LENS_EVENTS = {
	screen: "dashboard_screen",
	server: "dashboard_server",
	musicPlayed: "music_played",
	musicSkipped: "music_skipped",
	musicRefused: "music_refused",
	supportAnswered: "support_answered",
	supportRefused: "support_refused",
	commandRefused: "command_refused",
	dashboardChange: "dashboard_change",
} as const;

type Surface = "discord" | "dashboard";

/** What each event carries: names the bot chose, never an id, a username or anything somebody typed. */
interface LensEventProps {
	[LENS_EVENTS.musicPlayed]: { source: string };
	[LENS_EVENTS.musicSkipped]: { source: string; cause: string };
	[LENS_EVENTS.musicRefused]: { source: string; cause: string };
	[LENS_EVENTS.supportAnswered]: { surface: Surface; by: SupportWay; article: string };
	[LENS_EVENTS.supportRefused]: { surface: Surface; by: SupportWay };
	[LENS_EVENTS.commandRefused]: { command: string; reason: RefusalReason; surface: "slash" | "prefix" };
	[LENS_EVENTS.dashboardChange]: { screen: string; how: ChangeWay };
}

const context = (guildId: string | null | undefined): { guildId: string } | undefined =>
	guildId === null || guildId === undefined ? undefined : { guildId };

/** Counts one event in the server it happened in; no user is ever passed, so none is counted. */
export function recordEvent<N extends keyof LensEventProps>(
	client: TestifyClient,
	name: N,
	props: LensEventProps[N],
	guildId?: string | null,
): void {
	const event: string = name;
	const values: Record<string, string> = props;
	client.shardlens?.track(event, values, context(guildId));
}

export function recordAction(client: TestifyClient, action: AutomaticAction, guildId?: string | null): void {
	client.shardlens?.track(action, {}, context(guildId));
}

/** Discord counts a refused slash command as answered, so the refusal is counted apart with its reason. */
export function recordRefusal(
	client: TestifyClient,
	command: string,
	reason: RefusalReason,
	surface: "slash" | "prefix",
	guildId: string | null,
): void {
	recordEvent(client, LENS_EVENTS.commandRefused, { command, reason, surface }, guildId);
}

/** The service and the reason as one value, since a breakdown reads one property at a time. */
const musicCause = (source: string, reason: MusicReason): string => `${source}/${reason}`;

/** A track the bot gave up on, or a request a service refused. */
export function recordMusicProblem(
	client: TestifyClient,
	event: typeof LENS_EVENTS.musicSkipped | typeof LENS_EVENTS.musicRefused,
	source: string,
	reason: MusicReason,
	guildId: string,
): void {
	recordEvent(client, event, { source, cause: musicCause(source, reason) }, guildId);
}

/** One of the bot's own handlers, by the first two parts of a custom ID; the rest is whatever the handler packed in. */
export function ownHandler(client: TestifyClient, customId: string | null): { id: string; action: string } | null {
	if (customId === null) return null;
	const [id = "", action = ""] = customId.split(":");
	return client.buttons.has(id) ? { id, action } : null;
}

/** The handler and its action as one name, `shop:buy`, or null for anything not the bot's own. */
export function ownHandlerName(client: TestifyClient, customId: string | null): string | null {
	const handler = ownHandler(client, customId);
	if (handler === null) return null;
	return handler.action === "" ? handler.id : `${handler.id}:${handler.action}`;
}

/** Custom events keep no dimensions, so a view's server is also its own property, which is what can be grouped. */
export const serverKey = (guildId: string): string => `in_${guildId}`;

type Runner = (interaction: Interaction, work: () => Promise<unknown>) => Promise<unknown>;

interface Watch {
	run: Runner;
	lastProblem: { name: string; at: number } | null;
	/** The options whose values may be sent, for a prefix run as for a slash one. */
	choices: ReadonlySet<string>;
}

const watches = new WeakMap<Shardlens, Watch>();

/** The SDK starts its own lines with its name, which the tag already says. */
const said = (message: string): string => `[SHARDLENS] ${message.replace(/^Shardlens:\s*/, "")}`;

/**
 * Options that list fixed choices wherever they are declared, so a value is one the bot wrote and never text, a number
 * or an id somebody typed; a name declared anywhere without choices is left out, since the SDK matches by name alone.
 */
export function choiceOptions(commands: Iterable<Command>): string[] {
	const fixed = new Map<string, boolean>();
	for (const command of commands) {
		for (const option of [...(command.options ?? []), ...subcommandsOf(command).flatMap((sub) => sub.options ?? [])]) {
			const listed = (option.choices?.length ?? 0) > 0 && option.unlogged !== true;
			fixed.set(option.name, (fixed.get(option.name) ?? true) && listed);
		}
	}
	return [...fixed].flatMap(([name, listed]) => (listed ? [name] : [])).sort();
}

/** Events wait here while the collector is away; one folder per collector and key, so two installs never swap them. */
export function spoolDir(target: Pick<LensTarget, "url" | "ingestKey">): string {
	const id = createHash("sha256")
		.update(`${target.url ?? ""}\n${target.ingestKey ?? ""}`)
		.digest("hex")
		.slice(0, 16);
	return join(tmpdir(), `testify-shardlens-${id}`);
}

/** `true` runs the collector inside the bot; anything but `false` or blank is said once and read as off. */
function embeddedAsked(client: TestifyClient): boolean {
	const value = client.env.SHARDLENS_EMBEDDED;
	if (value !== undefined && value !== "true" && value !== "false") {
		client.logger.warn("[SHARDLENS] SHARDLENS_EMBEDDED should be true or false, so it is read as false.");
	}
	return value === "true";
}

export async function startShardlens(client: TestifyClient): Promise<Shardlens | null> {
	const env = client.env;
	const embedded = embeddedAsked(client);
	if (!embedded && env.SHARDLENS_URL === undefined && env.SHARDLENS_INGEST_KEY === undefined) return null;

	let optedOut: string[];
	try {
		optedOut = await readOptOuts();
	} catch (error) {
		client.logger.warn(
			{ err: toError(error) },
			"[SHARDLENS] The opt-outs could not be read, so analytics stay off until the next start rather than count somebody who asked not to be.",
		);
		return null;
	}

	if (embedded) {
		if (env.SHARDLENS_URL !== undefined || env.SHARDLENS_INGEST_KEY !== undefined) {
			client.logger.warn("[SHARDLENS] SHARDLENS_EMBEDDED is on, so SHARDLENS_URL and its keys are not used.");
		}
		const own = await startEmbedded(client);
		if (own === null) return null;
		client.lensTarget = own;
	}

	const target = client.lensTarget;
	const choices = choiceOptions(client.commands.values());
	const lens = createShardlens(client, {
		endpoint: target.url,
		apiKey: target.ingestKey,
		captureOptionValues: choices,
		// Kept hashed and without who ran them, so a long outage or a restart costs no figures.
		spool: { dir: spoolDir(target) },
		release: botVersion(),
		environment: env.NODE_ENV,
		// One server every two seconds, so member counts stay current rather than being read only at start-up.
		refreshGuildCounts: true,
		// Who ran each command is sent only once the collector is in audit mode too; until then it is hashed.
		mode: "audit",
		auditIncludeProfile: true,
		optedOut,
		logger: {
			debug: (message) => client.logger.debug(said(message)),
			info: (message) => client.logger.info(said(message)),
			warn: (message) => client.logger.warn(said(message)),
		},
	});

	const watch: Watch = {
		run: lens.wrap((_: Interaction, work: () => Promise<unknown>) => work()),
		lastProblem: null,
		choices: new Set(choices),
	};
	lens.on("error", (name) => {
		watch.lastProblem = { name, at: Date.now() };
	});
	watches.set(lens, watch);
	client.shardlens = lens;
	return lens;
}

export function shardlensLine(target: LensTarget): string {
	if (target.embedded !== null) return `Shardlens, inside the bot · dashboard at ${target.embedded.dashboardUrl}`;
	const origin = collectorOrigin(target.url);
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
	/** The options given: every name is sent, a value only for an option with fixed choices. */
	options: readonly GivenOption[];
	durationMs: number;
	ok: boolean;
	/** What the command threw, of which the SDK keeps only the class and Discord's code. */
	error: unknown;
}

/** A prefix run is a message, which the SDK never reads, so the bot names the command it matched once it has run. */
export function recordPrefixRun(client: TestifyClient, message: Message, run: PrefixRun): void {
	const lens = client.shardlens;
	if (lens === null) return;
	const choices = watches.get(lens)?.choices ?? new Set<string>();
	const options = run.options.map((option) => option.name);
	const optionValues = Object.fromEntries(
		run.options.flatMap((option) =>
			option.value !== null && choices.has(option.name) ? [[option.name, option.value]] : [],
		),
	);

	lens.trackMessageCommand(message, {
		command: run.command,
		...(run.subcommand === null ? {} : { sub: run.subcommand }),
		...(options.length === 0 ? {} : { options }),
		...(Object.keys(optionValues).length === 0 ? {} : { optionValues }),
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
	const collector = collectorOrigin(client.lensTarget.url);
	const embedded = client.lensTarget.embedded !== null;

	if (lens === null) {
		return {
			state: "off",
			collector,
			embedded,
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
		embedded,
		mode: stats.mode ?? null,
		queued: stats.queueDepth + stats.pendingSalt,
		waitingForResponse: stats.pendingInteractions,
		dropped: Object.values(stats.dropped).reduce((sum, count) => sum + count, 0),
		failedSends: stats.failedFlushes,
		lastProblem: problem === null ? null : { name: problem.name, at: new Date(problem.at).toISOString() },
	};
}

/** Null while Shardlens is off. */
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
