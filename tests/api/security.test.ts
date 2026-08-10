import { createApi } from "@api/server";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { databaseConnected } from "@database/connection";
import { findSession } from "@database/repositories/dashboardSessionRepository";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));
jest.mock("@database/repositories/dashboardSessionRepository", () => ({
	findSession: jest.fn(() => Promise.resolve(null)),
	touchSession: jest.fn(() => Promise.resolve()),
	deleteSession: jest.fn(() => Promise.resolve()),
	deleteSessionsFor: jest.fn(() => Promise.resolve()),
}));
jest.mocked(databaseConnected).mockReturnValue(true);

const CSRF = "a-csrf-secret-of-some-length";

function envFor(overrides: Partial<Env> = {}): Env {
	return {
		NODE_ENV: "production",
		DASHBOARD_PORT: 3_000,
		DASHBOARD_BIND: "127.0.0.1",
		DASHBOARD_TRUST_PROXY: false,
		...overrides,
	} as Env;
}

function apiFor(env: Env = envFor(), client: TestifyClient = createMockClient({ isReady: () => true } as never)) {
	return createApi(client, env);
}

/** Both halves of the double-submit, as a browser running the SPA would send them. */
function signed(method: string, extra: Record<string, string> = {}): RequestInit {
	return { method, headers: { cookie: `dash_csrf=${CSRF}`, "x-csrf-token": CSRF, ...extra } };
}

describe("security headers", () => {
	it("sends a policy that stops an injected script running", async () => {
		const csp = (await apiFor().request("/api/health")).headers.get("content-security-policy") ?? "";

		expect(csp).toContain("script-src 'self'");
		expect(csp).not.toContain("unsafe-eval");
		// An inline <script> or an onerror= attribute is what an injection actually plants.
		expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
	});

	/** One framed click on this dashboard can wipe a guild's economy. */
	it("refuses to be framed, by both mechanisms", async () => {
		const headers = (await apiFor().request("/api/health")).headers;

		expect(headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
		expect(headers.get("x-frame-options")).toBe("DENY");
	});

	/** robots.txt only asks; this tells a crawler that ignored it not to keep what it found. */
	it("refuses to be indexed", async () => {
		expect((await apiFor().request("/api/health")).headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
	});

	it("stops a JSON response being sniffed as HTML", async () => {
		expect((await apiFor().request("/api/health")).headers.get("x-content-type-options")).toBe("nosniff");
	});

	it("leaks nothing through the referer, and keeps responses out of shared caches", async () => {
		const headers = (await apiFor().request("/api/health")).headers;

		expect(headers.get("referrer-policy")).toBe("no-referrer");
		expect(headers.get("cache-control")).toBe("no-store");
	});

	it("allows Discord's CDN for avatars and nothing else for images", async () => {
		const csp = (await apiFor().request("/api/health")).headers.get("content-security-policy") ?? "";

		expect(csp).toContain("img-src 'self' https://cdn.discordapp.com data:");
		expect(csp).toContain("base-uri 'none'");
		expect(csp).toContain("object-src 'none'");
	});

	/** HSTS over plain HTTP would pin a self-hoster's localhost to a scheme it cannot serve. */
	it("only pins HTTPS when it is actually served over HTTPS", async () => {
		const plain = apiFor(envFor({ DASHBOARD_BASE_URL: "http://localhost:5174" }));
		const secure = apiFor(envFor({ DASHBOARD_BASE_URL: "https://dash.example.com" }));

		expect((await plain.request("/api/health")).headers.get("strict-transport-security")).toBeNull();
		expect((await secure.request("/api/health")).headers.get("strict-transport-security")).toContain("max-age=");
	});
});

describe("CSRF protection", () => {
	function withPost(env: Env = envFor()) {
		const app = apiFor(env);
		app.post("/api/thing", (context) => context.json({ ok: true }));
		return app;
	}

	it("lets a request through when the header matches the cookie", async () => {
		expect((await withPost().request("/api/thing", signed("POST"))).status).toBe(200);
	});

	/** This is the whole attack: another site can make the browser send the cookie, but cannot set the header. */
	it("refuses a write carrying the cookie but no header", async () => {
		const response = await withPost().request("/api/thing", {
			method: "POST",
			headers: { cookie: `dash_csrf=${CSRF}` },
		});

		expect(response.status).toBe(403);
		expect(((await response.json()) as { error: { code: string } }).error.code).toBe("csrf");
	});

	it("refuses a header that does not match the cookie", async () => {
		const response = await withPost().request("/api/thing", {
			method: "POST",
			headers: { cookie: `dash_csrf=${CSRF}`, "x-csrf-token": "not-the-secret-at-all-no" },
		});

		expect(response.status).toBe(403);
	});

	it("refuses a write with neither", async () => {
		expect((await withPost().request("/api/thing", { method: "POST" })).status).toBe(403);
	});

	it("guards every mutating verb, not just POST", async () => {
		const app = apiFor();
		for (const verb of ["POST", "PUT", "PATCH", "DELETE"] as const) {
			app.on(verb, "/api/thing", (context) => context.json({ ok: true }));
		}

		for (const verb of ["POST", "PUT", "PATCH", "DELETE"]) {
			expect((await app.request("/api/thing", { method: verb })).status).toBe(403);
		}
	});

	/** Reads are exempt, which is exactly why no GET may ever change anything. */
	it("does not ask a read for a token", async () => {
		expect((await apiFor().request("/api/health")).status).toBe(200);
	});
});

describe("the error boundary", () => {
	it("says nothing about an internal failure", async () => {
		const client = createMockClient({ isReady: () => true } as never);
		const logged = jest.spyOn(client.logger, "error");
		const app = apiFor(envFor(), client);
		app.get("/api/boom", () => {
			throw new Error("/srv/testify/dist/api/secret.js exploded");
		});

		const response = await app.request("/api/boom");
		const body = (await response.json()) as { error: { code: string; message: string } };

		expect(response.status).toBe(500);
		expect(body.error.message).not.toMatch(/srv|dist|exploded/);
		expect(logged).toHaveBeenCalled();
	});

	/** The bot already separates "you did something wrong" from "this is a bug"; that is what 400 is for. */
	it("turns a UserFacingError into a 400 with its own wording", async () => {
		const app = apiFor();
		app.get("/api/nope", () => {
			throw new UserFacingError("That role sits above mine.");
		});

		const response = await app.request("/api/nope");
		const body = (await response.json()) as { error: { code: string; message: string } };

		expect(response.status).toBe(400);
		expect(body.error.message).toBe("That role sits above mine.");
	});

	it("does not log a refusal as an error", async () => {
		const client = createMockClient({ isReady: () => true } as never);
		const logged = jest.spyOn(client.logger, "error");
		const app = apiFor(envFor(), client);
		app.get("/api/nope", () => {
			throw new UserFacingError("Not allowed.");
		});

		await app.request("/api/nope");
		expect(logged).not.toHaveBeenCalled();
	});
});

describe("the body limit", () => {
	/** An unbounded body is a memory exhaustion vector on a process that is also a Discord bot. */
	it("refuses a body far larger than any settings patch", async () => {
		const app = apiFor();
		app.post("/api/thing", (context) => context.json({ ok: true }));

		const response = await app.request("/api/thing", {
			...signed("POST", { "content-type": "application/json" }),
			body: JSON.stringify({ note: "x".repeat(200_000) }),
		});

		expect(response.status).toBe(400);
	});

	it("accepts an ordinary one", async () => {
		const app = apiFor();
		app.post("/api/thing", (context) => context.json({ ok: true }));

		const response = await app.request("/api/thing", {
			...signed("POST", { "content-type": "application/json" }),
			body: JSON.stringify({ enabled: true }),
		});

		expect(response.status).toBe(200);
	});
});

describe("rate limiting", () => {
	/** One signed-in caller spends their own bucket long before the looser ceiling their address gets. */
	it("eventually refuses a caller hammering the API, and says when to come back", async () => {
		const app = apiFor();
		const headers = { cookie: "dash_session=one-caller" };

		let last = await app.request("/api/health", { headers });
		for (let attempt = 0; attempt < 400 && last.status !== 429; attempt += 1) {
			last = await app.request("/api/health", { headers });
		}

		expect(last.status).toBe(429);
		expect(Number(last.headers.get("retry-after"))).toBeGreaterThan(0);
		expect(((await last.json()) as { error: { code: string } }).error.code).toBe("rate_limited");
	});
});

/**
 * `verifyCsrf` prefers the session's stored secret over the readable cookie, which is what makes the
 * double-submit resistant to an attacker who can write cookies. Registered before `loadSession` the session was
 * always undefined there, so the stronger half never ran and only the forgeable half was left.
 */
describe("the CSRF check and the session it reads", () => {
	const SESSION_SECRET = "the-secret-stored-on-the-session";

	function oauthEnv(): Env {
		return envFor({
			DISCORD_CLIENT_ID: "100000000000000009",
			DISCORD_CLIENT_SECRET: "a-client-secret",
			DASHBOARD_BASE_URL: "https://dash.example.test",
			DASHBOARD_SESSION_SECRET: "a-session-secret-long-enough-to-derive-from",
			DASHBOARD_SESSION_TTL_DAYS: 7,
		});
	}

	function withSession(): TestifyClient {
		jest.mocked(findSession).mockResolvedValue({
			_id: "session-id",
			userId: "100000000000000001",
			username: "someone",
			csrfSecret: SESSION_SECRET,
		} as never);

		return createMockClient({ isReady: () => true } as never);
	}

	it("refuses a matched cookie and header that are not the session's secret", async () => {
		const response = await apiFor(oauthEnv(), withSession()).request("/api/auth/logout", {
			method: "POST",
			headers: { cookie: `dash_session=session-id; dash_csrf=${CSRF}`, "x-csrf-token": CSRF },
		});

		expect(response.status).toBe(403);
	});

	it("accepts the session's own secret", async () => {
		const response = await apiFor(oauthEnv(), withSession()).request("/api/auth/logout", {
			method: "POST",
			headers: {
				cookie: `dash_session=session-id; dash_csrf=${SESSION_SECRET}`,
				"x-csrf-token": SESSION_SECRET,
			},
		});

		expect(response.status).not.toBe(403);
	});
});
