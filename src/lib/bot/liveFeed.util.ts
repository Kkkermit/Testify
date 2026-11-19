import { type LiveUpdate, ShardlensClientError } from "@shardlens/client";
import { z } from "zod";
import { SECOND_MS } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { problemOf, readerFor, type ShardlensReader } from "@lib/bot/shardlensReader.util";
import { type AnalyticsProblem, type LiveNumbers, type LiveRead } from "@testify/shared";

/** One live stream from the collector, shared by every owner looking, open only while somebody is. */

/** The console asks every few seconds, so a stream nobody has asked about for this long has no reader left. */
const IDLE_MS = 30 * SECOND_MS;
const RETRY_MS = 5 * SECOND_MS;

const liveUpdate = z.object({
	ts: z.string(),
	perMinute: z.number(),
	errors15m: z.number(),
	perSecond: z.array(z.number()).max(60),
	p95Ms5m: z.number().nullable(),
	shards: z.array(z.object({ shard: z.number(), ping: z.number(), fresh: z.boolean() })).max(1_000),
	servers: z.number(),
});

/** A schema that would refuse what the client says the stream sends is a compile error. */
const takesWhatIsSent: LiveUpdate extends z.input<typeof liveUpdate> ? true : never = true;
void takesWhatIsSent;

function numbersOf(update: z.output<typeof liveUpdate>): LiveNumbers {
	return {
		at: update.ts,
		perMinute: update.perMinute,
		failed15m: update.errors15m,
		perSecond: update.perSecond,
		slowMs: update.p95Ms5m === null ? null : Math.round(update.p95Ms5m),
		shards: update.shards.map((row) => ({ shard: row.shard, pingMs: Math.round(row.ping), fresh: row.fresh })),
		servers: update.servers,
	};
}

export class LiveFeed {
	readonly #reader: ShardlensReader;
	readonly #now: () => number;
	#numbers: LiveNumbers | null = null;
	#problem: AnalyticsProblem | null = null;
	#open: AbortController | null = null;
	#askedAt = 0;
	#retryAt = 0;

	constructor(reader: ShardlensReader, now: () => number = Date.now) {
		this.#reader = reader;
		this.#now = now;
	}

	/** The latest numbers; asking is what keeps the stream open. */
	read(): LiveRead {
		this.#askedAt = this.#now();
		if (this.#open === null && this.#askedAt >= this.#retryAt) this.#start();
		return { numbers: this.#numbers, problem: this.#problem };
	}

	close(): void {
		this.#open?.abort();
	}

	#start(): void {
		const controller = new AbortController();
		const stream = this.#reader.live(controller.signal);
		if (stream === null) {
			this.#problem = "off";
			return;
		}
		this.#open = controller;
		void this.#follow(stream, controller);
	}

	async #follow(stream: AsyncIterable<LiveUpdate>, controller: AbortController): Promise<void> {
		try {
			for await (const update of stream) {
				const parsed = liveUpdate.safeParse(update);
				if (parsed.success) {
					this.#numbers = numbersOf(parsed.data);
					this.#problem = null;
				}
				// Leaving the loop is what closes the connection, and frees one of the collector's few live slots.
				if (this.#now() - this.#askedAt > IDLE_MS) break;
			}
		} catch (error) {
			this.#problem = error instanceof ShardlensClientError ? (problemOf(error) ?? "unreachable") : "unreachable";
			const wait = error instanceof ShardlensClientError ? (error.retryAfterSeconds ?? 0) * SECOND_MS : 0;
			this.#retryAt = this.#now() + Math.max(RETRY_MS, wait);
		} finally {
			controller.abort();
			if (this.#open === controller) this.#open = null;
			// Numbers from a stream that has closed are not "right now" for the next reader.
			this.#numbers = null;
		}
	}
}

const feeds = new WeakMap<TestifyClient, LiveFeed>();

export function liveFeedFor(client: TestifyClient): LiveFeed {
	let feed = feeds.get(client);
	if (feed === undefined) {
		feed = new LiveFeed(readerFor(client));
		feeds.set(client, feed);
	}
	return feed;
}

export function closeLiveFeed(client: TestifyClient): void {
	feeds.get(client)?.close();
}
