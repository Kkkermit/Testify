import { TimerRegistry } from "../../src/core/client";

async function flush(): Promise<void> {
	for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
}

describe("TimerRegistry", () => {
	let timers: TimerRegistry;

	beforeEach(() => {
		jest.useFakeTimers();
		timers = new TimerRegistry();
	});

	afterEach(() => {
		timers.stopAll();
		jest.useRealTimers();
	});

	it("repeats a task on the interval", async () => {
		const task = jest.fn();
		timers.every("tick", 1_000, task);

		for (let tick = 0; tick < 3; tick += 1) {
			jest.advanceTimersByTime(1_000);
			await flush();
		}

		expect(task).toHaveBeenCalledTimes(3);
	});

	it("skips a run while the previous one is still going", async () => {
		let release: (() => void) | undefined;
		const task = jest.fn(() => new Promise<void>((resolve) => (release = resolve)));

		timers.every("slow", 1_000, task);
		jest.advanceTimersByTime(3_000);
		expect(task).toHaveBeenCalledTimes(1);

		release?.();
		await flush();

		jest.advanceTimersByTime(1_000);
		expect(task).toHaveBeenCalledTimes(2);
	});

	it("runs a one-off task once and forgets it", () => {
		const task = jest.fn();
		timers.after("later", 500, task);

		jest.advanceTimersByTime(2_000);
		expect(task).toHaveBeenCalledTimes(1);
		expect(timers.size).toBe(0);
	});

	it("replaces a timer registered under a name already in use", () => {
		const first = jest.fn();
		const second = jest.fn();

		timers.every("job", 1_000, first);
		timers.every("job", 1_000, second);
		jest.advanceTimersByTime(1_000);

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
		expect(timers.size).toBe(1);
	});

	it("stops everything, so shutdown cannot leave a task running", () => {
		const task = jest.fn();
		timers.every("a", 1_000, task);
		timers.every("b", 1_000, task);

		timers.stopAll();
		jest.advanceTimersByTime(5_000);

		expect(task).not.toHaveBeenCalled();
		expect(timers.names()).toEqual([]);
	});

	it("does not let a throwing task take the process down", () => {
		timers.every("bad", 1_000, () => {
			throw new Error("boom");
		});

		expect(() => jest.advanceTimersByTime(2_000)).not.toThrow();
	});
});
