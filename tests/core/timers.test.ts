import { TimerRegistry } from "@core/client";

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

	it("stops everything, so shutdown cannot leave a task running", () => {
		const task = jest.fn();
		timers.every("a", 1_000, task);
		timers.every("b", 1_000, task);

		timers.stopAll();
		jest.advanceTimersByTime(5_000);

		expect(task).not.toHaveBeenCalled();
		expect(timers.names()).toEqual([]);
	});

	/** Contained is not the same as unnoticed: a job failing every minute in silence is unfindable. */
	it("reports a job that failed, naming it", async () => {
		const logger = { error: jest.fn() };
		const reporting = new TimerRegistry(logger as never);

		reporting.every("lotteryDraw", 1_000, () => {
			throw new Error("boom");
		});
		jest.advanceTimersByTime(1_000);
		await flush();
		reporting.stopAll();

		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ scope: "JOB_LOTTERYDRAW" }),
			expect.stringContaining("still running"),
		);
	});
});
