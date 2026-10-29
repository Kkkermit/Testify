import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type SampleInput, statusSamplesSince } from "@database/repositories/statusRepository";
import { resetCommandTimes } from "@lib/bot/performance.util";
import {
	commandCheck,
	coverage,
	DISCORD_API,
	eventLoopCheck,
	gatewayCheck,
	HEARTBEAT_GRACE_MS,
	liveStatus,
	memoryCheck,
	overallLevel,
	recentBuckets,
	statusReport,
	uptimeDays,
	watchDiscordApi,
} from "@lib/bot/status.util";
import { recordOutcome, resetServiceHealth, serviceChecks } from "@lib/infra/serviceHealth.util";
import { STATUS_LIMITS, type StatusLevel } from "@testify/shared";

jest.mock("@database/connection", () => ({ pingDatabase: jest.fn(() => Promise.resolve(12)) }));
jest.mock("@database/repositories/statusRepository", () => ({
	statusSamplesSince: jest.fn(() => Promise.resolve([])),
	firstStatusSampleAt: jest.fn(() => Promise.resolve(null)),
}));

const DAY = 86_400_000;
const SAMPLE = STATUS_LIMITS.sampleEveryMs;
/** Midday, so a day's worth of samples either side stays inside one UTC day. */
const NOON = Date.UTC(2026, 8, 23, 12);
const MB = 1024 * 1024;

function sample(at: number, level: StatusLevel = "operational", gatewayPingMs: number | null = 50): SampleInput {
	return { at: new Date(at), level, gatewayPingMs, databasePingMs: 5, eventLoopP99Ms: 10 };
}

/** One heartbeat every interval across `[from, to)`. */
function heartbeats(from: number, to: number, level: StatusLevel = "operational"): SampleInput[] {
	const out: SampleInput[] = [];
	for (let at = from; at < to; at += SAMPLE) out.push(sample(at, level));
	return out;
}

function client(overrides: Record<string, unknown> = {}): TestifyClient {
	return {
		isReady: () => true,
		ws: { ping: 40, shards: new Collection([[0, {}]]) },
		startedAt: NOON - 3_600_000,
		paused: false,
		logger: { debug: jest.fn() },
		rest: { on: jest.fn() },
		...overrides,
	} as unknown as TestifyClient;
}

beforeEach(() => {
	jest.clearAllMocks();
	resetServiceHealth();
	resetCommandTimes();
});

describe("the individual checks", () => {
	/** This bot's gateway sits around 100 ms, which used to be flagged; slow starts past 150 ms. */
	it("counts a gateway ping up to 150 ms as healthy", () => {
		expect(gatewayCheck(true, 100, 1).level).toBe("operational");
		expect(gatewayCheck(true, 150, 1).level).toBe("operational");
		expect(gatewayCheck(true, 151, 1).level).toBe("degraded");
	});

	/** discord.js reports -1 before the first heartbeat; that is not a latency of minus one millisecond. */
	it("reports no ping rather than -1 before the first heartbeat", () => {
		expect(gatewayCheck(true, -1, 1)).toEqual({ level: "unknown", pingMs: null, shards: 1 });
	});

	it("grades the event loop by its slowest ticks", () => {
		expect(eventLoopCheck({ p50Ms: null, p99Ms: null, maxMs: null }).level).toBe("unknown");
		expect(eventLoopCheck({ p50Ms: 10, p99Ms: 20, maxMs: 30 }).level).toBe("operational");
		expect(eventLoopCheck({ p50Ms: 10, p99Ms: 150, maxMs: 300 }).level).toBe("degraded");
		expect(eventLoopCheck({ p50Ms: 10, p99Ms: 1_500, maxMs: 3_000 }).level).toBe("down");
	});

	it("grades memory against the heap limit rather than the heap Node happens to have reserved", () => {
		expect(memoryCheck(100 * MB, 1_000 * MB, 200 * MB)).toEqual({
			level: "operational",
			heapUsedMb: 100,
			heapLimitMb: 1_000,
			rssMb: 200,
		});
		expect(memoryCheck(900 * MB, 1_000 * MB, 0).level).toBe("degraded");
		expect(memoryCheck(990 * MB, 1_000 * MB, 0).level).toBe("down");
	});

	/** Two runs and one failure is a coin toss, not a failure rate. */
	it("does not call a failure rate from a handful of runs", () => {
		expect(commandCheck({ runs: 2, failures: 1, p50Ms: 100, p95Ms: 200 }).level).toBe("operational");
	});
});

describe("overallLevel", () => {
	/** A joke API being down should not paint the whole bot red. */
	it("never lets a third-party outage call the bot down", () => {
		expect(overallLevel({ core: ["operational"], peripheral: ["down"], paused: false })).toBe("degraded");
	});
});

describe("coverage", () => {
	const points = [
		{ at: 0, level: "operational" as const, gatewayPingMs: 10 },
		{ at: SAMPLE, level: "down" as const, gatewayPingMs: null },
	];

	/** The last heartbeat before a crash must not keep the bot "up" for ever. */
	it("stops vouching after the grace period", () => {
		expect(coverage(points.slice(0, 1), 0, 100 * SAMPLE, 100 * SAMPLE).upMs).toBe(HEARTBEAT_GRACE_MS);
	});
});

describe("uptimeDays", () => {
	/** A bot that is off cannot report it, so the gap is the evidence. */
	it("counts a stretch with no heartbeats as time the bot was off", () => {
		const start = NOON - 12 * 3_600_000;
		const gapFrom = NOON - 6 * 3_600_000;
		const samples = [...heartbeats(start, gapFrom), ...heartbeats(gapFrom + 3 * 3_600_000, NOON)];
		const uptime = uptimeDays(samples, start, NOON).at(-1)?.uptime ?? 0;

		expect(uptime).toBeGreaterThan(0.7);
		expect(uptime).toBeLessThan(0.8);
	});
});

describe("recentBuckets", () => {
	it("marks a bucket with no heartbeat after the first one as offline", () => {
		const start = NOON - DAY;
		const samples = [...heartbeats(start, NOON - 4 * 3_600_000), ...heartbeats(NOON - 3_600_000, NOON)];
		const levels = recentBuckets(samples, start, NOON).map((bucket) => bucket.level);

		expect(levels).toContain("offline");
		expect(levels.at(-1)).toBe("operational");
	});

	it("carries the worst level and the average gateway ping of its heartbeats", () => {
		const start = NOON - 30 * 60_000;
		const samples = [sample(start, "operational", 40), sample(start + SAMPLE, "degraded", 60)];
		const last = recentBuckets(samples, start, start + 2 * SAMPLE).at(-1);

		expect(last).toMatchObject({ level: "degraded", gatewayPingMs: 50 });
	});
});

describe("liveStatus", () => {
	/** Discord's own API failing is the bot failing; a joke API failing is not. */
	it("treats the Discord API as core and other services as peripheral", async () => {
		for (let index = 0; index < 3; index += 1) {
			recordOutcome("icanhazdadjoke", { ok: false, at: NOON, latencyMs: null });
		}
		expect((await liveStatus(client(), { now: NOON })).level).toBe("degraded");

		for (let index = 0; index < 3; index += 1) recordOutcome(DISCORD_API, { ok: false, at: NOON, latencyMs: null });
		expect((await liveStatus(client(), { now: NOON })).level).toBe("down");
	});

	it("uses the ping it is given rather than a real database", async () => {
		const status = await liveStatus(client(), {
			now: NOON,
			pingDatabase: () => Promise.resolve(null),
		});

		expect(status.database.level).toBe("down");
		expect(status.level).toBe("down");
	});
});

describe("statusReport", () => {
	/** The live checks are the important half, so a failed history read must not take them down with it. */
	it("still answers when the history cannot be read", async () => {
		jest.mocked(statusSamplesSince).mockRejectedValueOnce(new Error("boom"));

		const report = await statusReport(client(), { now: NOON });

		expect(report.level).toBe("operational");
		expect(report.days.every((day) => day.uptime === null)).toBe(true);
	});
});

describe("watchDiscordApi", () => {
	it("records Discord's server errors against it, and its refusals not", () => {
		const on = jest.fn();
		watchDiscordApi(client({ rest: { on } }));
		const listener = on.mock.calls[0]?.[1] as (request: unknown, response: { status: number }) => void;

		listener({}, { status: 404 });
		listener({}, { status: 502 });

		expect(on).toHaveBeenCalledWith("response", expect.any(Function));
		expect(serviceChecks()[0]).toMatchObject({ name: DISCORD_API, calls: 2, failures: 1 });
	});
});
