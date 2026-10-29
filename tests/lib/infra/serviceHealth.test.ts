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
	/** One timeout is a blip; only a run of them is an outage. */
	it("is only down after several failures in a row", () => {
		expect(serviceLevel([ok(), failed(), failed()])).toBe("degraded");
		expect(serviceLevel([ok(), failed(), failed(), failed()])).toBe("down");
	});
});

describe("serviceChecks", () => {
	/** An outage last night must not keep a quiet service red all day. */
	it("forgets calls older than the window", () => {
		for (let index = 0; index < 3; index += 1) recordOutcome("pokeapi", failed(NOW - STATUS_LIMITS.windowMs - 1));

		expect(serviceChecks(NOW)[0]).toMatchObject({ level: "unknown", calls: 0, lastOk: false });
	});
});

describe("observe", () => {
	/** A deleted video is YouTube answering, not YouTube being down. */
	it("does not hold a failure against the service when it was the request's fault", async () => {
		await expect(
			observe("YouTube", () => Promise.reject(new Error("Video unavailable")), { blame: () => false }),
		).rejects.toThrow();

		expect(serviceChecks()[0]).toMatchObject({ lastOk: true, failures: 0 });
	});
});
