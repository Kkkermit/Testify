import {
	type ActivityLogFilters,
	createShardlensClient,
	type EventPropsQuery,
	type EventPropValues,
	type Filter,
	type LiveUpdate,
	type QueryResults,
	type QuerySpec,
	type SeriesMetric,
	type SeriesQuery,
	type ShardlensClient,
	ShardlensClientError,
	type Step,
	type TimeRange,
} from "@shardlens/client";
import { type ZodType, z } from "zod";
import { DAY_MS, LIMITS, MINUTE_MS } from "@config/constants";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { type AnalyticsProblem } from "@testify/shared";

/** The owner console's analytics, read from Shardlens with keys that never leave this process. */

const CACHE_MS = MINUTE_MS;
const MAX_CACHED = 200;

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Where the collector is, if it is somewhere a key may go: HTTPS, or HTTP to this machine, with no login in it. */
export function collectorOrigin(value: string | undefined): string | null {
	if (value === undefined || !URL.canParse(value)) return null;
	const url = new URL(value);
	if (url.username !== "" || url.password !== "") return null;
	const safe = url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK.has(url.hostname));
	return safe ? url.origin : null;
}

export class AnalyticsUnavailable extends Error {
	constructor(readonly problem: AnalyticsProblem) {
		super(`Shardlens analytics are unavailable: ${problem}`);
		this.name = "AnalyticsUnavailable";
	}
}

/** Whole UTC days ending today, closed on the next whole minute so a run that just landed is inside it. */
export function rangeOf(days: number, now = Date.now()): TimeRange {
	const today = Math.floor(now / DAY_MS) * DAY_MS;
	const to = Math.ceil((now + 1) / MINUTE_MS) * MINUTE_MS;
	return { from: new Date(today - (days - 1) * DAY_MS).toISOString(), to: new Date(to).toISOString() };
}

/** Every day in the window, oldest first and in UTC, so a quiet day is a zero rather than a hole in the chart. */
export function windowDays(days: number, now = Date.now()): string[] {
	return Array.from({ length: days }, (_, index) =>
		new Date(now - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10),
	);
}

const count = z
	.number()
	.nullable()
	.transform((value) => value ?? 0);

const maybe = z
	.number()
	.nullable()
	.optional()
	.transform((value) => value ?? null);

const bucketRows = z.array(z.object({ bucket: z.string(), servers: count }));

/** The client types what the collector sends but checks none of it, so the parts read here are checked again. */
const ANSWERS = {
	top: z.object({
		rows: z.array(z.object({ key: z.string(), value: z.number().nullable(), count: count.optional() })),
	}),
	series: z.object({ points: z.array(z.object({ t: z.string(), key: z.string().nullable(), value: count })) }),
	eventProps: z.object({ values: z.array(z.object({ value: z.string(), count })) }),
	commands: z.object({
		rows: z.array(
			z.object({ command: z.string(), runs: count, errorRate: z.number().nullable(), p95Ms: z.number().nullable() }),
		),
	}),
	server: z.object({ found: z.boolean(), uniqueUsersThisPeriod: z.number().nullable().optional() }),
	heatmap: z.object({ cells: z.array(z.object({ weekday: z.number(), hour: z.number(), value: count })) }),
	growth: z.object({
		daily: z.array(z.object({ day: z.string(), joins: count, leaves: count })),
		sizeAtInstall: bucketRows,
		activation: z.object({ joined: count.optional(), activated: count.optional(), rate: maybe }),
		installs: z.object({ active: count, inactive: count }).nullable().optional(),
		lifetimes: bucketRows,
		serverCount: z.object({ ours: count, discord: maybe, warn: z.boolean() }),
	}),
	audience: z.object({
		daily: z.array(z.object({ day: z.string(), users: count, newUsers: count })),
		stickiness: maybe,
		splits: z.record(z.string(), z.array(z.object({ key: z.string().nullable(), value: count })).optional()),
	}),
	reliability: z.object({
		from: z.string(),
		totals: z
			.object({
				runs: count,
				missedDeadlines: count,
				noResponse: count,
				errors: count,
				over3sRate: maybe,
				p50Ms: maybe,
				p95Ms: maybe,
				p99Ms: maybe,
			})
			.nullable(),
		errorsByCode: z.array(z.object({ key: z.string(), value: count })),
		rateLimits: z.array(z.object({ scope: z.string().nullable(), route: z.string().nullable(), count })),
		shards: z.array(z.object({ shard: z.number(), ping: count, stale: z.boolean() })),
		shardEvents: z.array(z.object({ ts: z.string(), shard: z.number(), state: z.string(), closeCode: maybe })),
	}),
	gauge: z.object({ points: z.array(z.object({ t: z.string(), value: maybe })) }),
	funnel: z.object({ steps: z.array(z.object({ name: z.string(), users: count, medianSeconds: maybe })) }),
	retention: z.object({
		periods: z.number(),
		cohorts: z.array(z.object({ cohort: z.string(), size: count, retained: z.array(count) })),
	}),
} as const;

type Kind = keyof typeof ANSWERS;
type AnswerOf<K extends Kind> = z.output<(typeof ANSWERS)[K]>;

/** Every query here asks `eventProps` for one property, so its answer is always the values. */
type Declared<K extends Kind> = K extends "eventProps" ? EventPropValues : QueryResults[K];

/** A schema that would refuse what the client says the collector sends is a compile error, not a blank chart. */
const takesWhatIsSent: { [K in Kind]: Declared<K> extends z.input<(typeof ANSWERS)[K]> ? true : never } = {
	top: true,
	series: true,
	eventProps: true,
	commands: true,
	server: true,
	heatmap: true,
	growth: true,
	audience: true,
	reliability: true,
	gauge: true,
	funnel: true,
	retention: true,
};
void takesWhatIsSent;

const metaAnswer = z.object({ rawRetentionDays: z.number(), mode: z.string() });

export type CollectorQuery = Extract<QuerySpec, { kind: Kind }>;

type Unranged<Q> = Q extends { range: TimeRange } ? Omit<Q, "range"> : never;

/** A query before the window is set, which `askFor` does. */
export type RangedQuery = Unranged<CollectorQuery>;

/** As many rows as the collector hands back for one ranking. */
export const ALL_ROWS = 500;

export const FAILED_OUTCOMES = ["error", "timeout", "no_response"] as const;

type SeriesExtra = Partial<Pick<SeriesQuery, "groupBy" | "filters" | "name">>;

export const dailySeries = (metric: SeriesMetric, extra: SeriesExtra = {}): Omit<SeriesQuery, "range"> => ({
	kind: "series",
	metric,
	interval: "day",
	timezone: "UTC",
	...extra,
});

export const eventProps = (name: string, prop: string): Omit<EventPropsQuery, "range"> => ({
	kind: "eventProps",
	name,
	prop,
});

export const serverFilter = (guildId: string): Filter[] => [{ field: "guild", op: "eq", value: guildId }];

export const commandStep = (name: string): Step => ({ type: "command", name });

/** What a failure means for the console. A 400 is a query this code got wrong, so it stays a bug. */
export function problemOf(error: ShardlensClientError): AnalyticsProblem | null {
	if (error.code === "invalid_options") return "off";
	if (error.code === "audit_mode_off") return "audit_off";
	if (error.status === 401 || error.status === 403) return "refused";
	if (error.status === 400) return null;
	return "unreachable";
}

/** Failures the owner can fix in a setting, said once a run; a collector that is merely down is the console's to say. */
const WORTH_SAYING = new Set(["invalid_options", "unauthorized", "activity_key_required", "invalid_response"]);
const worthSaying = (error: ShardlensClientError): boolean =>
	WORTH_SAYING.has(error.code) || (error.status >= 300 && error.status < 400);

interface ReaderOptions {
	now?: () => number;
	/** The `fetch` the client sends with, which a test replaces. */
	fetch?: typeof fetch;
	/** Where a setting the owner should fix is said, never with a key in it. */
	warn?: (message: string) => void;
}

type Settings = Pick<Env, "SHARDLENS_URL" | "SHARDLENS_READ_KEY" | "SHARDLENS_ACTIVITY_KEY">;

export class ShardlensReader {
	readonly #endpoint: string | null;
	readonly #counts: ShardlensClient | null;
	readonly #activity: ShardlensClient | null;
	readonly #now: () => number;
	readonly #warn: (message: string) => void;
	readonly #said = new Set<string>();
	readonly #cache = new Map<string, { at: number; answer: Promise<unknown> }>();

	constructor(env: Settings, options: ReaderOptions = {}) {
		this.#endpoint = collectorOrigin(env.SHARDLENS_URL);
		this.#now = options.now ?? Date.now;
		this.#warn = options.warn ?? (() => undefined);

		const clientFor = (apiKey: string | undefined): ShardlensClient | null =>
			this.#endpoint === null || apiKey === undefined
				? null
				: createShardlensClient({
						endpoint: this.#endpoint,
						apiKey,
						timeoutMs: LIMITS.externalApiTimeoutMs,
						...(options.fetch === undefined ? {} : { fetch: options.fetch }),
					});
		// An activity key can read everything a read key can, so it stands in for a missing one.
		this.#counts = clientFor(env.SHARDLENS_READ_KEY ?? env.SHARDLENS_ACTIVITY_KEY);
		this.#activity = clientFor(env.SHARDLENS_ACTIVITY_KEY);
	}

	/** Null until an address a key may go to is set. */
	get collector(): string | null {
		return this.#endpoint;
	}

	/** Whether who ran what can be asked at all, before asking. */
	get readsActivity(): boolean {
		return this.#activity !== null;
	}

	/** Answers from the last minute are shared, so paging and sorting a table does not ask the collector each time. */
	async query<K extends Kind>(spec: CollectorQuery & { kind: K }): Promise<AnswerOf<K>> {
		const schema = ANSWERS[spec.kind] as unknown as ZodType<AnswerOf<K>>;
		return this.#cached(JSON.stringify(spec), this.#counts, (client) => client.query(spec), schema);
	}

	async meta(): Promise<z.infer<typeof metaAnswer>> {
		return this.#cached("meta", this.#counts, (client) => client.meta(), metaAnswer);
	}

	/** One page of who ran what, newest first; only an activity key may ask. */
	async activityLog<T>(filters: ActivityLogFilters, schema: ZodType<T>): Promise<T> {
		return this.#cached(
			`activity:${JSON.stringify(filters)}`,
			this.#activity,
			(client) => client.activity.log(filters),
			schema,
		);
	}

	async topUsers<T>(window: "24h" | "7d", schema: ZodType<T>): Promise<T> {
		return this.#cached(`top-users:${window}`, this.#activity, (client) => client.activity.topUsers(window), schema);
	}

	/** The collector's live numbers, about once a second, until the signal aborts; null while there is no key. */
	live(signal: AbortSignal): AsyncIterable<LiveUpdate> | null {
		return this.#counts?.live({ signal }) ?? null;
	}

	async #cached<T>(
		id: string,
		client: ShardlensClient | null,
		ask: (client: ShardlensClient) => Promise<unknown>,
		schema: ZodType<T>,
	): Promise<T> {
		if (client === null) throw new AnalyticsUnavailable("off");

		const kept = this.#cache.get(id);
		if (kept !== undefined && this.#now() - kept.at < CACHE_MS) return kept.answer as Promise<T>;

		const answer = this.#ask(client, ask, schema);
		this.#remember(id, answer);
		answer.catch(() => {
			if (this.#cache.get(id)?.answer === answer) this.#cache.delete(id);
		});
		return answer;
	}

	async #ask<T>(
		client: ShardlensClient,
		ask: (client: ShardlensClient) => Promise<unknown>,
		schema: ZodType<T>,
	): Promise<T> {
		let sent: unknown;
		try {
			sent = await ask(client);
		} catch (error) {
			if (!(error instanceof ShardlensClientError)) throw error;
			const problem = problemOf(error);
			if (problem === null) throw error;
			if (worthSaying(error)) this.#sayOnce(error.code, error.message);
			throw new AnalyticsUnavailable(problem);
		}

		const parsed = schema.safeParse(sent);
		if (parsed.success) return parsed.data;
		this.#sayOnce("shape", "The collector answered in a shape this version of the bot does not read.");
		throw new AnalyticsUnavailable("unreachable");
	}

	/** The client's messages never hold a key or the address it was given, so they are safe to log. */
	#sayOnce(code: string, message: string): void {
		if (this.#said.has(code)) return;
		this.#said.add(code);
		this.#warn(`[SHARDLENS] Could not read the collector: ${message}`);
	}

	#remember(id: string, answer: Promise<unknown>): void {
		this.#cache.delete(id);
		this.#cache.set(id, { at: this.#now(), answer });
		while (this.#cache.size > MAX_CACHED) {
			const oldest = this.#cache.keys().next().value;
			if (oldest === undefined) break;
			this.#cache.delete(oldest);
		}
	}
}

const readers = new WeakMap<TestifyClient, ShardlensReader>();

export function readerFor(client: TestifyClient): ShardlensReader {
	let reader = readers.get(client);
	if (reader === undefined) {
		reader = new ShardlensReader(client.env, {
			warn: (message) => {
				client.logger.warn(message);
			},
		});
		readers.set(client, reader);
	}
	return reader;
}

export type Ask = <Q extends RangedQuery>(spec: Q) => Promise<AnswerOf<Q["kind"]>>;

/** Asks the collector about the window ending now. */
export function askFor(client: TestifyClient, days: number, now = Date.now()): Ask {
	const reader = readerFor(client);
	const range = rangeOf(days, now);
	return async <Q extends RangedQuery>(spec: Q) => reader.query<Q["kind"]>({ ...spec, range });
}
