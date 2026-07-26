import { createLogger } from "../../src/core/logger";
import { TimerRegistry } from "../../src/core/timers";

const logger = createLogger({ level: "fatal", pretty: false });

describe("TimerRegistry", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("runs an interval and clears it on demand", () => {
		const registry = new TimerRegistry(logger);
		const tick = jest.fn();

		registry.interval("tick", 1_000, tick);
		jest.advanceTimersByTime(3_000);
		expect(tick).toHaveBeenCalledTimes(3);

		registry.clear("tick");
		jest.advanceTimersByTime(3_000);
		expect(tick).toHaveBeenCalledTimes(3);
		expect(registry.size).toBe(0);
	});

	// Six intervals ran in the previous code and none were ever cleared.
	it("clears everything at once", () => {
		const registry = new TimerRegistry(logger);
		registry.interval("a", 1_000, jest.fn());
		registry.interval("b", 1_000, jest.fn());
		registry.timeout("c", 1_000, jest.fn());

		expect(registry.size).toBe(3);
		registry.clearAll();
		expect(registry.size).toBe(0);
	});

	it("replaces a timer registered under the same name", () => {
		const registry = new TimerRegistry(logger);
		const first = jest.fn();
		const second = jest.fn();

		registry.interval("job", 1_000, first);
		registry.interval("job", 1_000, second);
		jest.advanceTimersByTime(2_000);

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(2);
	});

	// This is the guard the lottery double-payout needed.
	it("skips a guarded tick while the previous run is still in flight", async () => {
		const registry = new TimerRegistry(logger);
		let started = 0;
		let release: (() => void) | undefined;

		registry.guardedInterval("slow", 1_000, () => {
			started += 1;
			return new Promise<void>((resolve) => {
				release = resolve;
			});
		});

		jest.advanceTimersByTime(1_000);
		expect(started).toBe(1);

		jest.advanceTimersByTime(3_000);
		expect(started).toBe(1);

		release?.();
		await Promise.resolve();
		await Promise.resolve();

		jest.advanceTimersByTime(1_000);
		expect(started).toBe(2);
	});

	it("keeps running after a task throws", () => {
		const registry = new TimerRegistry(logger);
		const failing = jest.fn(() => {
			throw new Error("boom");
		});

		registry.interval("failing", 1_000, failing);
		expect(() => jest.advanceTimersByTime(2_000)).not.toThrow();
		expect(failing).toHaveBeenCalledTimes(2);
	});

	it("forgets a one-shot timeout once it has fired", () => {
		const registry = new TimerRegistry(logger);
		registry.timeout("once", 1_000, jest.fn());

		jest.advanceTimersByTime(1_000);
		expect(registry.has("once")).toBe(false);
	});
});
