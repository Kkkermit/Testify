import { type Context, Hono } from "hono";
import { callerKey, clientAddress, RateLimiter } from "@api/middleware/rateLimit";

describe("RateLimiter", () => {
	it("allows up to the limit and refuses the next one", () => {
		const limiter = new RateLimiter({ limit: 3, windowMs: 1_000 });

		expect([1, 2, 3].map(() => limiter.check("a", 0).allowed)).toEqual([true, true, true]);
		expect(limiter.check("a", 0).allowed).toBe(false);
	});

	it("says how long to wait", () => {
		const limiter = new RateLimiter({ limit: 1, windowMs: 60_000 });
		limiter.check("a", 0);

		expect(limiter.check("a", 10_000).retryAfterMs).toBe(50_000);
	});

	it("starts a fresh window once the old one has passed", () => {
		const limiter = new RateLimiter({ limit: 1, windowMs: 1_000 });
		limiter.check("a", 0);

		expect(limiter.check("a", 999).allowed).toBe(false);
		expect(limiter.check("a", 1_000).allowed).toBe(true);
	});

	/** One noisy caller must not spend everybody else's allowance. */
	it("counts each caller separately", () => {
		const limiter = new RateLimiter({ limit: 1, windowMs: 1_000 });
		limiter.check("a", 0);

		expect(limiter.check("b", 0).allowed).toBe(true);
	});

	/** Without a bound, a flood of one-off keys is a memory leak with a rate limiter's name on it. */
	it("does not grow without limit when every key is used once", () => {
		const limiter = new RateLimiter({ limit: 10, windowMs: 1_000, maxKeys: 50 });

		for (let index = 0; index < 500; index += 1) limiter.check(`key-${String(index)}`, index * 10);

		expect(limiter.size).toBeLessThanOrEqual(50);
	});

	it("drops the oldest when everything in the window is still live", () => {
		const limiter = new RateLimiter({ limit: 10, windowMs: 600_000, maxKeys: 20 });

		for (let index = 0; index < 100; index += 1) limiter.check(`key-${String(index)}`, index);

		expect(limiter.size).toBeLessThanOrEqual(20);
	});

	it("keeps a caller inside the window while it sweeps", () => {
		const limiter = new RateLimiter({ limit: 2, windowMs: 60_000 });
		limiter.check("busy", 0);
		limiter.check("busy", 1);
		limiter.sweep(2);

		expect(limiter.check("busy", 3).allowed).toBe(false);
	});
});

/** The helpers read a live request, so the cheapest honest way to test them is through a real one. */
async function contextFor(headers: Record<string, string> = {}): Promise<Context> {
	const app = new Hono();
	let captured: Context | undefined;
	app.get("/", (context) => {
		captured = context;
		return context.text("ok");
	});

	await app.request("/", { headers });
	return captured!;
}

describe("callerKey", () => {
	/** A session identifies a person; an address identifies a household. */
	it("prefers the session over the address", async () => {
		const context = await contextFor({ cookie: "dash_session=abc123" });

		expect(callerKey(context, false)).toBe("s:abc123");
	});

	it("falls back to the address for anyone not signed in, which is who a sign-in flood is", async () => {
		const context = await contextFor();

		expect(callerKey(context, false)).toMatch(/^i:/);
	});
});

describe("clientAddress", () => {
	/**
	 * Trusting `x-forwarded-for` without a proxy in front lets anyone forge their address and so their whole
	 * rate-limit bucket. That is why DASHBOARD_TRUST_PROXY defaults to false.
	 */
	it("ignores a forwarded header when no proxy is trusted", async () => {
		const context = await contextFor({ "x-forwarded-for": "1.2.3.4" });

		expect(clientAddress(context, false)).not.toBe("1.2.3.4");
	});

	it("reads the first hop when a proxy is trusted", async () => {
		const context = await contextFor({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });

		expect(clientAddress(context, true)).toBe("1.2.3.4");
	});

	it("copes with a trusted proxy that sent nothing", async () => {
		const context = await contextFor();

		expect(clientAddress(context, true)).toBe("unknown");
	});
});
