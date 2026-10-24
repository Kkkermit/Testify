import { ErrorThrottle, gatewayRefusal, reportSurvivable, signatureOf, SUMMARY_INTERVAL_MS } from "@core/resilience";
import { createMockClient } from "@tests/helpers/mocks";

function loggerSpy(): { error: jest.Mock; warn: jest.Mock } {
	return { error: jest.fn(), warn: jest.fn() };
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

	/** A thrown non-error is turned into one, keeping its context. */
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

describe("gatewayRefusal", () => {
	it("reads the status of a handshake Discord's gateway refused", () => {
		expect(gatewayRefusal(new Error("Unexpected server response: 503"), "SHARD_0")).toBe(503);
		expect(gatewayRefusal(new Error("Unexpected server response: 520"), "GATEWAY")).toBe(520);
	});

	/** A 4xx is the bot's request being wrong, which is worth an error line rather than a shrug. */
	it("ignores a refusal that is not Discord's fault", () => {
		expect(gatewayRefusal(new Error("Unexpected server response: 401"), "SHARD_0")).toBeNull();
		expect(gatewayRefusal(new Error("Unexpected server response: 5030"), "SHARD_0")).toBeNull();
		expect(gatewayRefusal(new Error("connect ECONNREFUSED"), "SHARD_0")).toBeNull();
	});

	it("only speaks for the gateway", () => {
		expect(gatewayRefusal(new Error("Unexpected server response: 503"), "UNCAUGHT")).toBeNull();
		expect(gatewayRefusal(new Error("Unexpected server response: 503"), "JOB_REMINDERS")).toBeNull();
	});
});

describe("reportSurvivable on a refused gateway handshake", () => {
	/** Discord's gateway answering 503 once logged a red line that read like the bot had crashed. */
	it("warns that Discord refused and the bot is retrying, with no error line", () => {
		const logger = loggerSpy();

		reportSurvivable(logger as never, new ErrorThrottle(), "SHARD_0", new Error("Unexpected server response: 503"), 0);

		expect(logger.error).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ scope: "SHARD_0", status: 503 }),
			expect.stringMatching(/\[SHARD_0\] Discord's gateway refused the connection \(503\).*retrying/),
		);
	});

	it("collapses repeats like any other failure, and counts them", () => {
		const logger = loggerSpy();
		const throttle = new ErrorThrottle();
		const refusal = (): Error => new Error("Unexpected server response: 503");

		reportSurvivable(logger as never, throttle, "SHARD_0", refusal(), 0);
		reportSurvivable(logger as never, throttle, "SHARD_0", refusal(), 1);
		reportSurvivable(logger as never, throttle, "SHARD_0", refusal(), 2);
		expect(logger.warn).toHaveBeenCalledTimes(1);

		reportSurvivable(logger as never, throttle, "SHARD_0", refusal(), SUMMARY_INTERVAL_MS);
		expect(logger.warn).toHaveBeenLastCalledWith(
			expect.objectContaining({ repeatedSince: 2 }),
			expect.stringContaining("2 more times"),
		);
	});

	it("still logs a 4xx from the gateway as an error", () => {
		const logger = loggerSpy();

		reportSurvivable(logger as never, new ErrorThrottle(), "SHARD_0", new Error("Unexpected server response: 401"), 0);

		expect(logger.warn).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledTimes(1);
	});
});
