import {
	observe,
	recordOutcome,
	resetServiceHealth,
	serviceChecks,
	serviceLevel,
	type Outcome,
} from "@lib/infra/serviceHealth.util";
import { STATUS_LIMITS } from "@testify/shared";

const NOW = 1_800_000_000_000;

const ok = (at = NOW): Outcome => ({ ok: true, at, latencyMs: 100 });
const failed = (at = NOW): Outcome => ({ ok: false, at, latencyMs: 100 });

beforeEach(() => {
	resetServiceHealth();
});

describe("serviceLevel", () => {
	it("says nothing about a service nobody has called", () => {
		expect(serviceLevel([])).toBe("unknown");
	});

	it("is operational while every call succeeds", () => {
		expect(serviceLevel([ok(), ok()])).toBe("operational");
	});

	it("is degraded after a failure it has since recovered from", () => {
		expect(serviceLevel([failed(), ok()])).toBe("degraded");
	});

	/** One timeout is a blip; only a run of them is an outage. */
	it("is only down after several failures in a row", () => {
		expect(serviceLevel([ok(), failed(), failed()])).toBe("degraded");
		expect(serviceLevel([ok(), failed(), failed(), failed()])).toBe("down");
	});
});

describe("serviceChecks", () => {
	it("reports each service with its last call", () => {
		recordOutcome("reddit", ok(NOW - 1_000));
		recordOutcome("reddit", failed(NOW));

		expect(serviceChecks(NOW)).toEqual([
			{
				name: "reddit",
				level: "degraded",
				calls: 2,
				failures: 1,
				lastAt: new Date(NOW).toISOString(),
				lastOk: false,
				latencyMs: 100,
			},
		]);
	});

	/** An outage last night must not keep a quiet service red all day. */
	it("forgets calls older than the window", () => {
		for (let index = 0; index < 3; index += 1) recordOutcome("pokeapi", failed(NOW - STATUS_LIMITS.windowMs - 1));

		expect(serviceChecks(NOW)[0]).toMatchObject({ level: "unknown", calls: 0, lastOk: false });
	});

	it("keeps a bounded history per service", () => {
		for (let index = 0; index < 100; index += 1) recordOutcome("wikipedia", ok());

		expect(serviceChecks(NOW)[0]?.calls).toBe(20);
	});
});

describe("observe", () => {
	it("records a success with how long it took", async () => {
		const clock = jest.fn().mockReturnValueOnce(1_000).mockReturnValue(1_250);

		await expect(observe("YouTube", () => Promise.resolve("done"), { now: clock })).resolves.toBe("done");
		expect(serviceChecks(1_250)[0]).toMatchObject({ lastOk: true, latencyMs: 250 });
	});

	it("records a failure and still throws it", async () => {
		await expect(observe("YouTube", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
		expect(serviceChecks()[0]?.lastOk).toBe(false);
	});

	/** A deleted video is YouTube answering, not YouTube being down. */
	it("does not hold a failure against the service when it was the request's fault", async () => {
		await expect(
			observe("YouTube", () => Promise.reject(new Error("Video unavailable")), { blame: () => false }),
		).rejects.toThrow();

		expect(serviceChecks()[0]).toMatchObject({ lastOk: true, failures: 0 });
	});
});
