import { type Context, Hono } from "hono";
import { ApiProblem } from "@api/errors";
import { callerKeys, clientAddress, rateLimit, RateLimiter } from "@api/middleware/rateLimit";

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

describe("callerKeys", () => {
	/**
	 * The session cookie is attacker-controlled. Counted on it alone, a flood mints a fresh allowance per
	 * request by rotating one header — 400 requests once passed a 300-per-minute limit without a single refusal.
	 */
	it("always counts against the address, even when a session cookie is present", async () => {
		const context = await contextFor({ cookie: "dash_session=abc123" });

		expect(callerKeys(context, false)[0]).toMatch(/^i:/);
	});

	/** A session identifies a person where an address identifies a household, so it narrows the bucket. */
	it("adds the session as a second, tighter key", async () => {
		const context = await contextFor({ cookie: "dash_session=abc123" });

		expect(callerKeys(context, false)).toContain("s:abc123");
	});

	it("counts only the address for anyone not signed in, which is who a sign-in flood is", async () => {
		const context = await contextFor();

		expect(await Promise.resolve(callerKeys(context, false))).toHaveLength(1);
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

describe("the middleware, against a caller who forges cookies", () => {
	function app(): Hono {
		const instance = new Hono();
		const limiters = {
			perCaller: new RateLimiter({ limit: 3, windowMs: 60_000 }),
			perAddress: new RateLimiter({ limit: 5, windowMs: 60_000 }),
		};
		instance.use("*", rateLimit(limiters, { name: "t", trustProxy: false }));
		instance.get("/", (context) => context.text("ok"));
		instance.onError((error) => Response.json({ e: 1 }, { status: error instanceof ApiProblem ? error.status : 500 }));
		return instance;
	}

	/**
	 * Rotating the session cookie once bought a fresh allowance per request: 400 requests passed a 300-per-minute
	 * limit with none refused. The address is now always one of the keys, so the ceiling cannot be forged past.
	 */
	it("still refuses once the address ceiling is spent, however many cookies are used", async () => {
		const instance = app();
		const statuses: number[] = [];

		for (let index = 0; index < 8; index += 1) {
			const response = await instance.request("/", { headers: { cookie: `dash_session=forged${String(index)}` } });
			statuses.push(response.status);
		}

		expect(statuses.filter((status) => status === 429).length).toBeGreaterThan(0);
	});

	/** One person's own bucket is the tighter of the two, so a single session cannot spend the whole address. */
	it("refuses one session at its own limit before the address ceiling", async () => {
		const instance = app();
		const statuses: number[] = [];

		for (let index = 0; index < 5; index += 1) {
			const response = await instance.request("/", { headers: { cookie: "dash_session=same" } });
			statuses.push(response.status);
		}

		expect(statuses).toEqual([200, 200, 200, 429, 429]);
	});
});
