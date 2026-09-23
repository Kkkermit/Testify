import {
	commandTimes,
	eventLoopDelay,
	percentile,
	recordCommandTime,
	resetCommandTimes,
	resetEventLoopDelay,
	startEventLoopMonitor,
	stopEventLoopMonitor,
} from "@lib/bot/performance.util";
import { STATUS_LIMITS } from "@testify/shared";

const NOW = 1_800_000_000_000;

beforeEach(() => {
	resetCommandTimes();
});

afterEach(() => {
	stopEventLoopMonitor();
});

describe("percentile", () => {
	it("has nothing to say about no values", () => {
		expect(percentile([], 0.5)).toBeNull();
	});

	it("picks a value that was actually observed", () => {
		expect(percentile([10, 20, 30, 40], 0.5)).toBe(20);
		expect(percentile([10, 20, 30, 40], 0.95)).toBe(40);
		expect(percentile([7], 0.95)).toBe(7);
	});
});

describe("commandTimes", () => {
	it("reports runs, failures and the typical and slow response", () => {
		for (const ms of [100, 200, 300, 400]) recordCommandTime(ms, true, NOW);
		recordCommandTime(9_000, false, NOW);

		expect(commandTimes(NOW)).toEqual({ runs: 5, failures: 1, p50Ms: 300, p95Ms: 9_000 });
	});

	it("only counts the last hour", () => {
		recordCommandTime(100, false, NOW - STATUS_LIMITS.windowMs - 1);
		recordCommandTime(100, true, NOW);

		expect(commandTimes(NOW)).toMatchObject({ runs: 1, failures: 0 });
	});

	it("keeps a bounded history", () => {
		for (let index = 0; index < 1_000; index += 1) recordCommandTime(1, true, NOW);

		expect(commandTimes(NOW).runs).toBe(500);
	});
});

describe("eventLoopDelay", () => {
	it("says nothing before the monitor has started", () => {
		expect(eventLoopDelay()).toEqual({ p50Ms: null, p99Ms: null, maxMs: null });
	});

	it("reports the delay once the monitor has had time to sample", async () => {
		startEventLoopMonitor();
		startEventLoopMonitor();
		await new Promise((resolve) => setTimeout(resolve, 120));

		const delay = eventLoopDelay();
		expect(delay.p99Ms).toEqual(expect.any(Number));
		expect(delay.maxMs ?? 0).toBeGreaterThanOrEqual(delay.p50Ms ?? 0);

		resetEventLoopDelay();
		expect(eventLoopDelay().p99Ms).toBeNull();
	});
});
