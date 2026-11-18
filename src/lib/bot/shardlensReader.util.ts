import { type ZodType, z } from "zod";
import { DAY_MS, MINUTE_MS } from "@config/constants";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { ServiceError } from "@core/errors";
import { fetchJson } from "@lib/infra/http.util";
import { type AnalyticsProblem } from "@testify/shared";

/** The owner console's analytics, read from Shardlens with the read key, which never leaves this process. */

const SERVICE = "Shardlens";
const CACHE_MS = MINUTE_MS;
const MAX_CACHED = 200;

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Where the collector is, if it is somewhere the read key may go: HTTPS, or HTTP to this machine, with no login in it. */
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

export interface Range {
	from: string;
	to: string;
}

/** Whole UTC days ending today, closed on the next whole minute so a run that just landed is inside it. */
export function rangeOf(days: number, now = Date.now()): Range {
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

export const topAnswer = z.object({
	rows: z.array(z.object({ key: z.string(), value: z.number().nullable(), count: count.optional() })),
});

export const seriesAnswer = z.object({
	points: z.array(z.object({ t: z.string(), key: z.string().nullable(), value: count })),
});

export const propsAnswer = z.object({ values: z.array(z.object({ value: z.string(), count })) });

export const commandsAnswer = z.object({
	rows: z.array(
		z.object({ command: z.string(), runs: count, errorRate: z.number().nullable(), p95Ms: z.number().nullable() }),
	),
});

export const serverAnswer = z.object({ found: z.boolean(), uniqueUsersThisPeriod: z.number().nullable().optional() });

export const metaAnswer = z.object({ rawRetentionDays: z.number(), mode: z.string() });

const maybe = z
	.number()
	.nullable()
	.optional()
	.transform((value) => value ?? null);

export const heatmapAnswer = z.object({
	cells: z.array(z.object({ weekday: z.number(), hour: z.number(), value: count })),
});

const bucketRows = z.array(z.object({ bucket: z.string(), servers: count }));

export const growthAnswer = z.object({
	daily: z.array(z.object({ day: z.string(), joins: count, leaves: count })),
	sizeAtInstall: bucketRows,
	activation: z.object({ joined: count.optional(), activated: count.optional(), rate: maybe }),
	installs: z.object({ active: count, inactive: count }).nullable().optional(),
	lifetimes: bucketRows,
	serverCount: z.object({ ours: count, discord: maybe, warn: z.boolean() }),
});

export const audienceAnswer = z.object({
	daily: z.array(z.object({ day: z.string(), users: count, newUsers: count })),
	stickiness: maybe,
	splits: z.record(z.string(), z.array(z.object({ key: z.string().nullable(), value: count }))),
});

export const reliabilityAnswer = z.object({
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
});

export const gaugeAnswer = z.object({ points: z.array(z.object({ t: z.string(), value: maybe })) });

export const funnelAnswer = z.object({
	steps: z.array(z.object({ name: z.string(), users: count, medianSeconds: maybe })),
});

export const retentionAnswer = z.object({
	periods: z.number(),
	cohorts: z.array(z.object({ cohort: z.string(), size: count, retained: z.array(count) })),
});

export type Spec = Record<string, unknown>;

/** As many rows as the collector hands back for one ranking. */
export const ALL_ROWS = 500;

export const FAILED_OUTCOMES = ["error", "timeout", "no_response"];

export const dailySeries = (metric: string, extra: Spec = {}): Spec => ({
	kind: "series",
	metric,
	interval: "day",
	timezone: "UTC",
	...extra,
});

export const eventProps = (name: string, prop: string): Spec => ({ kind: "eventProps", name, prop });

export const serverFilter = (guildId: string): Spec[] => [{ field: "guild", op: "eq", value: guildId }];

interface Call {
	method: "GET" | "POST";
	path: string;
	body?: string;
}

export class ShardlensReader {
	readonly #endpoint: string | null;
	readonly #key: string | null;
	readonly #now: () => number;
	readonly #cache = new Map<string, { at: number; answer: Promise<unknown> }>();

	constructor(env: Pick<Env, "SHARDLENS_URL" | "SHARDLENS_READ_KEY">, now: () => number = Date.now) {
		this.#endpoint = collectorOrigin(env.SHARDLENS_URL);
		this.#key = env.SHARDLENS_READ_KEY ?? null;
		this.#now = now;
	}

	/** Null until an address the key may go to is set. */
	get collector(): string | null {
		return this.#endpoint;
	}

	/** Answers from the last minute are shared, so paging and sorting a table does not ask the collector each time. */
	async query<T>(spec: Spec, schema: ZodType<T>): Promise<T> {
		return this.#cached(JSON.stringify(spec), schema, {
			method: "POST",
			path: "/v1/query",
			body: JSON.stringify(spec),
		});
	}

	async meta(): Promise<z.infer<typeof metaAnswer>> {
		return this.#cached("meta", metaAnswer, { method: "GET", path: "/v1/meta" });
	}

	async #cached<T>(id: string, schema: ZodType<T>, call: Call): Promise<T> {
		if (this.#endpoint === null || this.#key === null) throw new AnalyticsUnavailable("off");

		const kept = this.#cache.get(id);
		if (kept !== undefined && this.#now() - kept.at < CACHE_MS) return kept.answer as Promise<T>;

		const answer = this.#ask(this.#endpoint, this.#key, schema, call);
		this.#remember(id, answer);
		answer.catch(() => {
			if (this.#cache.get(id)?.answer === answer) this.#cache.delete(id);
		});
		return answer;
	}

	async #ask<T>(endpoint: string, key: string, schema: ZodType<T>, call: Call): Promise<T> {
		try {
			return await fetchJson(SERVICE, `${endpoint}${call.path}`, schema, {
				method: call.method,
				headers: {
					authorization: `Bearer ${key}`,
					...(call.body === undefined ? {} : { "content-type": "application/json" }),
				},
				...(call.body === undefined ? {} : { body: call.body }),
				recorded: false,
			});
		} catch (error) {
			if (!(error instanceof ServiceError)) throw error;
			if (error.status === 401 || error.status === 403) throw new AnalyticsUnavailable("refused");
			// A 400 is a query the collector does not understand, which is this code's fault rather than its outage.
			if (error.status === 400) throw error;
			throw new AnalyticsUnavailable("unreachable");
		}
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
		reader = new ShardlensReader(client.env);
		readers.set(client, reader);
	}
	return reader;
}

export type Ask = <T>(spec: Spec, schema: ZodType<T>) => Promise<T>;

/** Asks the collector about the window ending now. */
export function askFor(client: TestifyClient, days: number, now = Date.now()): Ask {
	const reader = readerFor(client);
	const range = rangeOf(days, now);
	return (spec, schema) => reader.query({ ...spec, range }, schema);
}
