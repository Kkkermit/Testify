import { type ZodType, z } from "zod";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { ServiceError } from "@core/errors";
import { fetchJson } from "@lib/infra/http.util";
import { type AnalyticsProblem } from "@testify/shared";

/** The owner console's analytics, read from Shardlens with the read key, which never leaves this process. */

const SERVICE = "Shardlens";
const CACHE_MS = 60_000;
const MAX_CACHED = 200;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

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

export type Spec = Record<string, unknown>;

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
		this.#endpoint = env.SHARDLENS_URL === undefined ? null : new URL(env.SHARDLENS_URL).origin;
		this.#key = env.SHARDLENS_READ_KEY ?? null;
		this.#now = now;
	}

	/** The collector's origin, where its own dashboard opens; null until one is set. */
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

	/** How long the collector keeps raw events, and which privacy mode it is in. */
	async meta(): Promise<z.infer<typeof metaAnswer>> {
		return this.#cached("meta", metaAnswer, { method: "GET", path: "/v1/meta" });
	}

	async #cached<T>(id: string, schema: ZodType<T>, call: Call): Promise<T> {
		if (this.#endpoint === null || this.#key === null) throw new AnalyticsUnavailable("off");

		const kept = this.#cache.get(id);
		if (kept !== undefined && this.#now() - kept.at < CACHE_MS) return kept.answer as Promise<T>;

		const answer = this.#ask(this.#endpoint, this.#key, schema, call);
		this.#remember(id, answer);
		answer.catch(() => this.#cache.delete(id));
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
