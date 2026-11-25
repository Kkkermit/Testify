import { type LiveUpdate, ShardlensClientError } from "@shardlens/client";
import { LiveFeed } from "@lib/bot/liveFeed.util";
import { type ShardlensReader } from "@lib/bot/shardlensReader.util";

const update = (perMinute: number): LiveUpdate => ({
	ts: "2026-11-15T12:00:00.000Z",
	perMinute,
	errors15m: 1,
	perSecond: [0, 2, 1],
	p95Ms5m: 812.4,
	shards: [{ shard: 0, ping: 41.6, fresh: true }],
	activeShards: 1,
	staleShards: [],
	servers: 12,
});

/** A stream the test feeds by hand, which ends when the feed's signal aborts, as the client's does. */
class Stream {
	readonly signals: AbortSignal[] = [];
	#push: ((value: LiveUpdate | Error) => void) | null = null;

	open(signal: AbortSignal): AsyncIterable<LiveUpdate> {
		this.signals.push(signal);
		const next = (): Promise<LiveUpdate | Error | null> =>
			new Promise((resolve) => {
				this.#push = resolve;
				signal.addEventListener("abort", () => {
					resolve(null);
				});
			});
		return {
			async *[Symbol.asyncIterator]() {
				for (;;) {
					const value = await next();
					if (value === null) return;
					if (value instanceof Error) throw value;
					yield value;
				}
			},
		};
	}

	async send(value: LiveUpdate | Error): Promise<void> {
		this.#push?.(value);
		await new Promise((resolve) => setImmediate(resolve));
	}
}

function feedWith(stream: Stream | null, clock: { now: number }): LiveFeed {
	const reader = { live: (signal: AbortSignal) => stream?.open(signal) ?? null } as unknown as ShardlensReader;
	return new LiveFeed(reader, () => clock.now);
}

describe("LiveFeed", () => {
	/** The collector keeps ten live streams an address, so every owner looking shares the bot's one. */
	it("opens one stream however many times it is read, and passes the numbers on", async () => {
		const clock = { now: 0 };
		const stream = new Stream();
		const feed = feedWith(stream, clock);

		expect(feed.read()).toEqual({ numbers: null, problem: null });
		feed.read();
		await stream.send(update(7));

		expect(stream.signals).toHaveLength(1);
		expect(feed.read()).toEqual({
			numbers: {
				at: "2026-11-15T12:00:00.000Z",
				perMinute: 7,
				failed15m: 1,
				perSecond: [0, 2, 1],
				slowMs: 812,
				shards: [{ shard: 0, pingMs: 42, fresh: true }],
				servers: 12,
			},
			problem: null,
		});
		feed.close();
	});

	/** A stream left open for nobody holds one of the collector's few slots, and its numbers are not "right now" later. */
	it("closes once nobody has asked for thirty seconds, and forgets the numbers it had", async () => {
		const clock = { now: 0 };
		const stream = new Stream();
		const feed = feedWith(stream, clock);

		feed.read();
		await stream.send(update(7));
		clock.now = 31_000;
		await stream.send(update(8));

		expect(stream.signals[0]?.aborted).toBe(true);
		expect(feed.read().numbers).toBeNull();
		expect(stream.signals).toHaveLength(2);
		feed.close();
	});

	it("says why it has nothing, and waits before it tries again, as long as the collector asks", async () => {
		const clock = { now: 0 };
		const stream = new Stream();
		const feed = feedWith(stream, clock);

		feed.read();
		await stream.send(new ShardlensClientError("busy", { status: 503, code: "busy", retryAfterSeconds: 10 }));

		expect(feed.read()).toEqual({ numbers: null, problem: "unreachable" });
		clock.now = 9_000;
		feed.read();
		expect(stream.signals).toHaveLength(1);
		clock.now = 10_000;
		feed.read();
		expect(stream.signals).toHaveLength(2);
		feed.close();
	});

	it("is off without a key, and opens nothing", () => {
		expect(feedWith(null, { now: 0 }).read()).toEqual({ numbers: null, problem: "off" });
	});
});
