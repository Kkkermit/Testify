import { ErrorThrottle, reportSurvivable, signatureOf, SUMMARY_INTERVAL_MS } from "@core/resilience";
import { createMockClient } from "@tests/helpers/mocks";

function loggerSpy(): { error: jest.Mock } {
	return { error: jest.fn() };
}

describe("ErrorThrottle", () => {
	it("lets the first occurrence through", () => {
		const throttle = new ErrorThrottle();

		expect(throttle.consider("a", 0)).toEqual({ suppressed: 0 });
	});

	/** A gateway fault can throw hundreds of times a second, and the same line that often hides the cause. */
	it("swallows a repeat inside the interval", () => {
		const throttle = new ErrorThrottle();
		throttle.consider("a", 0);

		expect(throttle.consider("a", 1_000)).toBeNull();
		expect(throttle.consider("a", SUMMARY_INTERVAL_MS - 1)).toBeNull();
	});

	it("speaks again once the interval has passed, counting what it swallowed", () => {
		const throttle = new ErrorThrottle();
		throttle.consider("a", 0);
		throttle.consider("a", 1);
		throttle.consider("a", 2);

		expect(throttle.consider("a", SUMMARY_INTERVAL_MS)).toEqual({ suppressed: 2 });
	});

	it("starts counting again after a summary", () => {
		const throttle = new ErrorThrottle();
		throttle.consider("a", 0);
		throttle.consider("a", 1);
		throttle.consider("a", SUMMARY_INTERVAL_MS);

		expect(throttle.consider("a", SUMMARY_INTERVAL_MS * 2)).toEqual({ suppressed: 0 });
	});

	/** Collapsing everything into one bucket would hide a second, different fault behind the first one. */
	it("keeps different signatures apart", () => {
		const throttle = new ErrorThrottle();
		throttle.consider("a", 0);

		expect(throttle.consider("b", 0)).toEqual({ suppressed: 0 });
	});

	it("honours a shorter interval when one is given", () => {
		const throttle = new ErrorThrottle(10);
		throttle.consider("a", 0);

		expect(throttle.consider("a", 5)).toBeNull();
		expect(throttle.consider("a", 10)).toEqual({ suppressed: 1 });
	});

	/** A message carrying a unique id makes every occurrence its own signature, which would grow forever. */
	it("stays bounded when every failure is unique", () => {
		const throttle = new ErrorThrottle();

		for (let index = 0; index < 5_000; index += 1) throttle.consider(`unique-${String(index)}`, 0);

		expect(throttle.size).toBeLessThanOrEqual(500);
	});

	it("drops signatures nothing has seen for a while first", () => {
		const throttle = new ErrorThrottle();
		for (let index = 0; index < 500; index += 1) throttle.consider(`old-${String(index)}`, 0);

		throttle.consider("new", SUMMARY_INTERVAL_MS * 2);

		expect(throttle.size).toBe(1);
	});
});

describe("signatureOf", () => {
	it("separates the same message thrown from different places", () => {
		const error = new Error("boom");

		expect(signatureOf(error, "GATEWAY")).not.toBe(signatureOf(error, "UNCAUGHT"));
	});

	it("collapses the same fault from the same place", () => {
		expect(signatureOf(new Error("boom"), "GATEWAY")).toBe(signatureOf(new Error("boom"), "GATEWAY"));
	});
});

describe("reportSurvivable", () => {
	it("logs the error with its scope", () => {
		const logger = loggerSpy();
		const error = new Error("boom");

		reportSurvivable(logger as never, new ErrorThrottle(), "GATEWAY", error, 0);

		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ err: error, scope: "GATEWAY" }),
			expect.stringContaining("[GATEWAY]"),
		);
	});

	/** Everything past this point exists to keep the bot up, so the log has to say that it is still up. */
	it("says the bot is still running", () => {
		const logger = loggerSpy();

		reportSurvivable(logger as never, new ErrorThrottle(), "UNCAUGHT", new Error("boom"), 0);

		expect(logger.error.mock.calls[0]?.[1]).toContain("still running");
	});

	it("writes nothing for a repeat inside the interval", () => {
		const logger = loggerSpy();
		const throttle = new ErrorThrottle();

		reportSurvivable(logger as never, throttle, "UNCAUGHT", new Error("boom"), 0);
		reportSurvivable(logger as never, throttle, "UNCAUGHT", new Error("boom"), 1);

		expect(logger.error).toHaveBeenCalledTimes(1);
	});

	it("carries how many were swallowed into the summary", () => {
		const logger = loggerSpy();
		const throttle = new ErrorThrottle();

		reportSurvivable(logger as never, throttle, "UNCAUGHT", new Error("boom"), 0);
		reportSurvivable(logger as never, throttle, "UNCAUGHT", new Error("boom"), 1);
		reportSurvivable(logger as never, throttle, "UNCAUGHT", new Error("boom"), SUMMARY_INTERVAL_MS);

		expect(logger.error).toHaveBeenLastCalledWith(
			expect.objectContaining({ repeatedSince: 1 }),
			expect.stringContaining("Still failing"),
		);
	});

	/** A rejection can carry anything at all, and a string one used to lose its context entirely. */
	it("turns a thrown non-error into one", () => {
		const logger = loggerSpy();

		reportSurvivable(logger as never, new ErrorThrottle(), "UNHANDLED_REJECTION", "just a string", 0);

		expect(logger.error.mock.calls[0]?.[0]).toMatchObject({ err: expect.any(Error) });
	});

	it("returns rather than throwing, whatever it was handed", () => {
		const client = createMockClient();

		expect(() => {
			reportSurvivable(client.logger, new ErrorThrottle(), "UNCAUGHT", undefined, 0);
		}).not.toThrow();
	});
});
