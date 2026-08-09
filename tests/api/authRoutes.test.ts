import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import type * as discord from "@api/discord";
import { exchangeCode, fetchGuilds } from "@api/discord";
import { ApiProblem, problemBody } from "@api/errors";
import { oauthConfigFrom } from "@api/oauth";
import { auth } from "@api/routes/auth";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { createSession, deleteSession, deleteSessionsFor } from "@database/repositories/dashboardSessionRepository";
import { type SetupStatus } from "@testify/shared";

jest.mock("@api/discord", () => {
	const actual = jest.requireActual<typeof discord>("@api/discord");
	return {
		...actual,
		exchangeCode: jest.fn(() =>
			Promise.resolve({ accessToken: "at", refreshToken: "rt", expiresAt: new Date(Date.now() + 604_800_000) }),
		),
		fetchUser: jest.fn(() => Promise.resolve({ id: "100000000000000001", username: "someone", avatar: null })),
		fetchGuilds: jest.fn(() => Promise.resolve([])),
	};
});
jest.mock("@database/repositories/dashboardSessionRepository", () => ({
	createSession: jest.fn(() =>
		Promise.resolve({ id: "new-session-id", csrfSecret: "new-csrf", expiresAt: new Date() }),
	),
	findSession: jest.fn(() => Promise.resolve(null)),
	touchSession: jest.fn(() => Promise.resolve()),
	deleteSession: jest.fn(() => Promise.resolve()),
	deleteSessionsFor: jest.fn(() => Promise.resolve()),
	readTokens: jest.fn(() => Promise.resolve(null)),
	updateTokens: jest.fn(() => Promise.resolve()),
}));

const OWNER = "100000000000000001";

const exchanged = jest.mocked(exchangeCode);
const guildsFetched = jest.mocked(fetchGuilds);
const sessionCreated = jest.mocked(createSession);
const sessionDeleted = jest.mocked(deleteSession);
const allSessionsDeleted = jest.mocked(deleteSessionsFor);

function envFor(overrides: Partial<Env> = {}): Env {
	return {
		NODE_ENV: "production",
		DISCORD_CLIENT_ID: "100000000000000009",
		DISCORD_CLIENT_SECRET: "a-client-secret",
		DASHBOARD_BASE_URL: "https://dash.example.test",
		DASHBOARD_SESSION_SECRET: "a-session-secret-long-enough-to-derive-a-key-from",
		DASHBOARD_SESSION_TTL_DAYS: 7,
		...overrides,
	} as Env;
}

function app(env: Env = envFor(), session: object | undefined = undefined): Hono<ApiBindings> {
	const client = { isOwner: (id: string) => id === OWNER, logger: { error: jest.fn() } } as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", env);
		context.set("oauth", oauthConfigFrom(env));
		if (session !== undefined) context.set("session", session as never);
		await next();
	});
	instance.route("/auth", auth);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

/** The `state` and PKCE verifier the login step put in a cookie, read back out of the redirect it issued. */
async function beginLogin(instance: Hono<ApiBindings>): Promise<{ state: string; cookie: string }> {
	const response = await instance.request("/auth/login");
	const cookie = response.headers.get("set-cookie") ?? "";
	const pending = JSON.parse(decodeURIComponent(/dash_oauth=([^;]+)/.exec(cookie)?.[1] ?? "{}")) as {
		state: string;
	};

	return { state: pending.state, cookie: `dash_oauth=${encodeURIComponent(JSON.stringify(pending))}` };
}

beforeEach(() => {
	jest.clearAllMocks();
	exchanged.mockResolvedValue({
		accessToken: "at",
		refreshToken: "rt",
		expiresAt: new Date(Date.now() + 604_800_000),
	});
	guildsFetched.mockResolvedValue([]);
	sessionCreated.mockResolvedValue({ id: "new-session-id", csrfSecret: "new-csrf", expiresAt: new Date() });
});

describe("GET /auth/setup", () => {
	it("says a full install is configured, and never what anything is set to", async () => {
		const body = (await (await app().request("/auth/setup")).json()) as SetupStatus;

		expect(body).toMatchObject({ configured: true, missing: [] });
		expect(JSON.stringify(body)).not.toContain("a-client-secret");
	});

	/** A half-install has to show what to add rather than a stack trace, and this is unauthenticated on purpose. */
	it("names every missing setting at once", async () => {
		const half = envFor({ DISCORD_CLIENT_SECRET: undefined, DASHBOARD_SESSION_SECRET: undefined });

		const body = (await (await app(half).request("/auth/setup")).json()) as SetupStatus;

		expect(body.configured).toBe(false);
		expect(body.missing).toEqual(expect.arrayContaining(["DISCORD_CLIENT_SECRET", "DASHBOARD_SESSION_SECRET"]));
	});
});

describe("GET /auth/login", () => {
	it("sends the caller to Discord with a state and a PKCE challenge", async () => {
		const response = await app().request("/auth/login");
		const target = new URL(response.headers.get("location") ?? "");

		expect(response.status).toBe(302);
		expect(target.origin + target.pathname).toBe("https://discord.com/oauth2/authorize");
		expect(target.searchParams.get("state")).toBeTruthy();
		expect(target.searchParams.get("code_challenge")).toBeTruthy();
		expect(target.searchParams.get("code_challenge_method")).toBe("S256");
	});

	/** A state kept in server memory would not survive a restart, and one in the database is a free write. */
	it("keeps the pending flow in a short-lived httpOnly cookie", async () => {
		const cookie = (await app().request("/auth/login")).headers.get("set-cookie") ?? "";

		expect(cookie).toContain("dash_oauth=");
		expect(cookie).toContain("HttpOnly");
	});

	it("refuses to start when the install is not finished", async () => {
		const half = envFor({ DISCORD_CLIENT_SECRET: undefined });

		expect((await app(half).request("/auth/login")).status).toBe(503);
	});

	/** `returnTo` is validated here, before it is ever put in a cookie and redirected to. */
	it("refuses an absolute return address", async () => {
		expect((await app().request("/auth/login?returnTo=https://evil.example")).status).toBe(400);
	});

	it("refuses a protocol-relative return address, which a browser reads as absolute", async () => {
		expect((await app().request("/auth/login?returnTo=//evil.example")).status).toBe(400);
	});

	/**
	 * `RequireAuth` sends `pathname + search`, so signing in from any tabbed or searched page carried a query
	 * string. Refusing it answered 400 and left no way in at all from the owner console or a levelling tab.
	 */
	it("accepts the query string a tabbed page signs in from", async () => {
		const path = encodeURIComponent("/owner?tab=logs");
		const response = await app().request(`/auth/login?returnTo=${path}`);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toContain("discord.com");
	});
});

describe("GET /auth/callback", () => {
	async function callback(query: string, cookie?: string): Promise<Response> {
		return app().request(`/auth/callback${query}`, cookie === undefined ? {} : { headers: { cookie } });
	}

	it("exchanges the code and issues a session", async () => {
		const instance = app();
		const { state, cookie } = await beginLogin(instance);

		const response = await instance.request(`/auth/callback?code=abc&state=${state}`, { headers: { cookie } });

		expect(exchanged).toHaveBeenCalled();
		expect(sessionCreated).toHaveBeenCalled();
		expect(response.status).toBe(302);
		expect(response.headers.get("set-cookie")).toContain("dash_session=new-session-id");
	});

	/**
	 * The state is the whole defence against a forged callback. Without the cookie there is nothing to compare
	 * against, and accepting it would let anyone hand a victim a signed-in session.
	 */
	it("refuses a state with no pending flow behind it", async () => {
		const response = await callback("?code=abc&state=whatever");

		expect(response.headers.get("location")).toBe("/sign-in?error=state");
		expect(exchanged).not.toHaveBeenCalled();
	});

	it("refuses a state that does not match the one it issued", async () => {
		const instance = app();
		const { cookie } = await beginLogin(instance);

		const response = await instance.request("/auth/callback?code=abc&state=not-the-one", { headers: { cookie } });

		expect(response.headers.get("location")).toBe("/sign-in?error=state");
		expect(exchanged).not.toHaveBeenCalled();
	});

	/** One state, one use — the cookie is cleared whether the exchange succeeds or not. */
	it("clears the pending cookie even when it refuses", async () => {
		const instance = app();
		const { cookie } = await beginLogin(instance);

		const response = await instance.request("/auth/callback?code=abc&state=wrong", { headers: { cookie } });

		expect(response.headers.get("set-cookie")).toContain("dash_oauth=;");
	});

	it("sends somebody who pressed Cancel to a friendly page rather than an error", async () => {
		const response = await callback("?error=access_denied");

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/sign-in?denied=1");
	});

	it("refuses a callback missing its code", async () => {
		expect((await callback("?state=abc")).status).toBe(400);
	});
});

describe("POST /auth/logout", () => {
	it("deletes this session and clears the cookies", async () => {
		const response = await app(envFor(), {
			_id: "sid",
			userId: OWNER,
			username: "someone",
			tokenExpiresAt: new Date(Date.now() + 604_800_000),
		}).request("/auth/logout", {
			method: "POST",
		});

		expect(sessionDeleted).toHaveBeenCalledWith("sid");
		expect(response.status).toBe(204);
		expect(response.headers.get("set-cookie")).toContain("dash_session=;");
	});

	it("refuses an anonymous caller", async () => {
		expect((await app().request("/auth/logout", { method: "POST" })).status).toBe(401);
	});
});

describe("POST /auth/logout-all", () => {
	/** The panic button after a leak: every browser this person is signed in on loses access at once. */
	it("deletes every session this person has", async () => {
		await app(envFor(), {
			_id: "sid",
			userId: OWNER,
			username: "someone",
			tokenExpiresAt: new Date(Date.now() + 604_800_000),
		}).request("/auth/logout-all", {
			method: "POST",
		});

		expect(allSessionsDeleted).toHaveBeenCalledWith(OWNER);
	});
});

describe("GET /auth/me", () => {
	it("refuses an anonymous caller, which is the signal to render the sign-in screen", async () => {
		expect((await app().request("/auth/me")).status).toBe(401);
	});

	/**
	 * Ownership is read from the env per request, never off the session document — so removing an ID revokes
	 * the console on that person's next click rather than at their next sign-in.
	 */
	it("reads ownership from the client rather than the session", async () => {
		const stale = {
			_id: "sid",
			userId: "100000000000000002",
			username: "someone",
			isOwner: true,
			tokenExpiresAt: new Date(Date.now() + 604_800_000),
		};

		const body = (await (await app(envFor(), stale).request("/auth/me")).json()) as { isOwner: boolean };

		expect(body.isOwner).toBe(false);
	});

	it("carries no token, secret or refresh token", async () => {
		const raw = await (
			await app(envFor(), {
				_id: "sid",
				userId: OWNER,
				username: "someone",
				tokenExpiresAt: new Date(Date.now() + 604_800_000),
			}).request("/auth/me")
		).text();

		for (const leak of ["a-client-secret", "a-session-secret", "accessToken", "refreshToken", "csrfSecret"]) {
			expect(raw).not.toContain(leak);
		}
	});
});
