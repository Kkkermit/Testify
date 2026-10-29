import {
	commandTimes,
	eventLoopDelay,
	recordCommandTime,
	resetCommandTimes,
	resetEventLoopDelay,
	startEventLoopMonitor,
	stopEventLoopMonitor,
} from "@lib/bot/performance.util";

const NOW = 1_800_000_000_000;

beforeEach(() => {
	resetCommandTimes();
});

afterEach(() => {
	stopEventLoopMonitor();
});

describe("commandTimes", () => {
	it("keeps a bounded history", () => {
		for (let index = 0; index < 1_000; index += 1) recordCommandTime(1, true, NOW);

		expect(commandTimes(NOW).runs).toBe(500);
	});
});

describe("eventLoopDelay", () => {
	/** A fixed 120ms wait failed on CI when a runner stall let it end before the monitor's second tick, its first sample. */
	it("reports the delay once the monitor has had time to sample", async () => {
		startEventLoopMonitor();
		startEventLoopMonitor();

		const deadline = Date.now() + 3_000;
		while (eventLoopDelay().p99Ms === null && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, 25));
		}

		const delay = eventLoopDelay();
		expect(delay.p99Ms).toEqual(expect.any(Number));
		expect(delay.maxMs ?? 0).toBeGreaterThanOrEqual(delay.p50Ms ?? 0);

		resetEventLoopDelay();
		expect(eventLoopDelay().p99Ms).toBeNull();
	});
});
