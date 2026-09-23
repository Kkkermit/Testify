import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { firstStatusSampleAt, type SampleInput, statusSamplesSince } from "@database/repositories/statusRepository";
import { recordCommandTime, resetCommandTimes } from "@lib/bot/performance.util";
import {
	commandCheck,
	coverage,
	databaseCheck,
	DISCORD_API,
	eventLoopCheck,
	gatewayCheck,
	HEARTBEAT_GRACE_MS,
	liveStatus,
	memoryCheck,
	overallLevel,
	packageChecks,
	recentBuckets,
	statusReport,
	uptimeDays,
	watchDiscordApi,
	worst,
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
const BINARIES = { ytDlp: "/bin/yt-dlp", ffmpeg: "/bin/ffmpeg", ytDlpVersion: "2026.09.01" };

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
	it("treats a gateway that is not ready as down, and a slow one as degraded", () => {
		expect(gatewayCheck(false, 40, 1).level).toBe("down");
		expect(gatewayCheck(true, 40, 1).level).toBe("operational");
		expect(gatewayCheck(true, STATUS_LIMITS.gatewaySlowMs + 1, 1).level).toBe("degraded");
	});

	/** discord.js reports -1 before the first heartbeat; that is not a latency of minus one millisecond. */
	it("reports no ping rather than -1 before the first heartbeat", () => {
		expect(gatewayCheck(true, -1, 1)).toEqual({ level: "unknown", pingMs: null, shards: 1 });
	});

	it("treats a database that did not answer as down", () => {
		expect(databaseCheck(null).level).toBe("down");
		expect(databaseCheck(STATUS_LIMITS.databaseSlowMs + 1).level).toBe("degraded");
		expect(databaseCheck(3).level).toBe("operational");
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

	it("says nothing about commands when none have run", () => {
		expect(commandCheck({ runs: 0, failures: 0, p50Ms: null, p95Ms: null }).level).toBe("unknown");
	});

	it("marks commands degraded when they are slow or failing", () => {
		expect(commandCheck({ runs: 10, failures: 0, p50Ms: 100, p95Ms: 200 }).level).toBe("operational");
		expect(commandCheck({ runs: 10, failures: 0, p50Ms: 100, p95Ms: 6_000 }).level).toBe("degraded");
		expect(commandCheck({ runs: 10, failures: 5, p50Ms: 100, p95Ms: 200 }).level).toBe("degraded");
	});

	/** Two runs and one failure is a coin toss, not a failure rate. */
	it("does not call a failure rate from a handful of runs", () => {
		expect(commandCheck({ runs: 2, failures: 1, p50Ms: 100, p95Ms: 200 }).level).toBe("operational");
	});

	it("reports the music binaries, and a stale yt-dlp as degraded", () => {
		const now = Date.UTC(2026, 8, 5);

		expect(packageChecks(BINARIES, now).map((check) => check.level)).toEqual(["operational", "operational"]);
		expect(packageChecks({ ...BINARIES, ytDlpVersion: "2026.01.01" }, now)[0]?.level).toBe("degraded");
		expect(packageChecks({ ytDlp: null, ffmpeg: null }, now).map((check) => check.level)).toEqual(["down", "degraded"]);
	});
});

describe("overallLevel", () => {
	it("is the worst of the core checks", () => {
		expect(overallLevel({ core: ["operational", "down"], peripheral: [], paused: false })).toBe("down");
		expect(overallLevel({ core: ["operational", "unknown"], peripheral: [], paused: false })).toBe("operational");
	});

	/** A joke API being down should not paint the whole bot red. */
	it("never lets a third-party outage call the bot down", () => {
		expect(overallLevel({ core: ["operational"], peripheral: ["down"], paused: false })).toBe("degraded");
	});

	it("counts a paused bot as degraded", () => {
		expect(overallLevel({ core: ["operational"], peripheral: [], paused: true })).toBe("degraded");
	});

	it("ranks levels by severity", () => {
		expect(worst([])).toBe("operational");
		expect(worst(["degraded", "unknown"])).toBe("degraded");
	});
});

describe("coverage", () => {
	const points = [
		{ at: 0, level: "operational" as const, gatewayPingMs: 10 },
		{ at: SAMPLE, level: "down" as const, gatewayPingMs: null },
	];

	it("lets each heartbeat vouch until the next one", () => {
		const covered = coverage(points, 0, 2 * SAMPLE, 10 * SAMPLE);

		expect(covered.upMs).toBe(SAMPLE);
		expect(covered.downMs).toBe(SAMPLE);
		expect(covered.pings).toEqual([10]);
	});

	/** The last heartbeat before a crash must not keep the bot "up" for ever. */
	it("stops vouching after the grace period", () => {
		expect(coverage(points.slice(0, 1), 0, 100 * SAMPLE, 100 * SAMPLE).upMs).toBe(HEARTBEAT_GRACE_MS);
	});

	it("does not vouch for time that has not happened yet", () => {
		expect(coverage(points.slice(0, 1), 0, 100 * SAMPLE, 1_000).upMs).toBe(1_000);
	});
});

describe("uptimeDays", () => {
	it("has one entry per day in the window, oldest first, ending today", () => {
		const days = uptimeDays([], null, NOON);

		expect(days).toHaveLength(STATUS_LIMITS.historyDays);
		expect(days.at(-1)?.day).toBe("2026-09-23");
		expect(days.every((day) => day.uptime === null)).toBe(true);
	});

	it("is full for a day with a heartbeat every interval", () => {
		const start = NOON - 12 * 3_600_000;
		const days = uptimeDays(heartbeats(start, NOON), start, NOON);

		expect(days.at(-1)?.uptime).toBeCloseTo(1, 5);
	});

	/** The gap is the whole point: a bot that was off could not say so at the time. */
	it("counts a stretch with no heartbeats as time the bot was off", () => {
		const start = NOON - 12 * 3_600_000;
		const gapFrom = NOON - 6 * 3_600_000;
		const samples = [...heartbeats(start, gapFrom), ...heartbeats(gapFrom + 3 * 3_600_000, NOON)];
		const uptime = uptimeDays(samples, start, NOON).at(-1)?.uptime ?? 0;

		expect(uptime).toBeGreaterThan(0.7);
		expect(uptime).toBeLessThan(0.8);
	});

	it("counts time the bot reported itself down as downtime", () => {
		const start = NOON - 12 * 3_600_000;
		const uptime = uptimeDays(heartbeats(start, NOON, "down"), start, NOON).at(-1)?.uptime;

		expect(uptime).toBe(0);
	});

	it("leaves days before the first heartbeat empty rather than calling them outages", () => {
		const start = NOON - 3_600_000;
		const days = uptimeDays(heartbeats(start, NOON), start, NOON);

		expect(days.at(-2)?.uptime).toBeNull();
		expect(days.at(-1)?.uptime).toBeCloseTo(1, 5);
	});
});

describe("recentBuckets", () => {
	it("covers the last day in half hours", () => {
		const buckets = recentBuckets([], null, NOON);

		expect(buckets).toHaveLength(STATUS_LIMITS.recentBuckets);
		expect(buckets.every((bucket) => bucket.level === "none")).toBe(true);
	});

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
	it("reports every check and the overall level", async () => {
		recordCommandTime(120, true, NOON);

		const status = await liveStatus(client(), { binaries: BINARIES, now: NOON });

		expect(status).toMatchObject({
			level: "operational",
			uptimeMs: 3_600_000,
			paused: false,
			gateway: { level: "operational", pingMs: 40, shards: 1 },
			database: { level: "operational", pingMs: 12 },
			commands: { runs: 1, failures: 0 },
		});
		expect(status.packages.map((check) => check.key)).toEqual(["ytDlp", "ffmpeg"]);
	});

	/** Discord's own API failing is the bot failing; a joke API failing is not. */
	it("treats the Discord API as core and other services as peripheral", async () => {
		for (let index = 0; index < 3; index += 1) {
			recordOutcome("icanhazdadjoke", { ok: false, at: NOON, latencyMs: null });
		}
		expect((await liveStatus(client(), { binaries: BINARIES, now: NOON })).level).toBe("degraded");

		for (let index = 0; index < 3; index += 1) recordOutcome(DISCORD_API, { ok: false, at: NOON, latencyMs: null });
		expect((await liveStatus(client(), { binaries: BINARIES, now: NOON })).level).toBe("down");
	});

	it("uses the ping it is given rather than a real database", async () => {
		const status = await liveStatus(client(), {
			binaries: BINARIES,
			now: NOON,
			pingDatabase: () => Promise.resolve(null),
		});

		expect(status.database.level).toBe("down");
		expect(status.level).toBe("down");
	});
});

describe("statusReport", () => {
	it("adds the history read from the heartbeats", async () => {
		const start = NOON - 3_600_000;
		jest.mocked(statusSamplesSince).mockResolvedValueOnce(heartbeats(start, NOON));
		jest.mocked(firstStatusSampleAt).mockResolvedValueOnce(new Date(start));

		const report = await statusReport(client(), { binaries: BINARIES, now: NOON });

		expect(report.days.at(-1)?.uptime).toBeCloseTo(1, 5);
		expect(report.recent.at(-1)?.level).toBe("operational");
	});

	it("does not ask a database that is down for its history", async () => {
		const report = await statusReport(client(), {
			binaries: BINARIES,
			now: NOON,
			pingDatabase: () => Promise.resolve(null),
		});

		expect(statusSamplesSince).not.toHaveBeenCalled();
		expect(report.days.every((day) => day.uptime === null)).toBe(true);
	});

	/** The live checks are the important half, so a failed history read must not take them down with it. */
	it("still answers when the history cannot be read", async () => {
		jest.mocked(statusSamplesSince).mockRejectedValueOnce(new Error("boom"));

		const report = await statusReport(client(), { binaries: BINARIES, now: NOON });

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
