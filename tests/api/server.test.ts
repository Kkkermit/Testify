import { createApi, listenAdvice, startApi, worthRetrying } from "@api/server";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { databaseConnected } from "@database/connection";
import { type ApiErrorBody, type HealthResponse } from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));

const connected = jest.mocked(databaseConnected);

function apiFor(client: TestifyClient): ReturnType<typeof createApi> {
	return createApi(client, { DASHBOARD_PORT: 3_000, DASHBOARD_BIND: "127.0.0.1" } as Env);
}

function readyClient(isReady = true): TestifyClient {
	return createMockClient({ isReady: jest.fn(() => isReady) } as unknown as Partial<TestifyClient>);
}

describe("the health endpoint", () => {
	it("reports ready when Discord and the database are both up", async () => {
		connected.mockReturnValue(true);

		const response = await apiFor(readyClient()).request("/api/health");
		const body = (await response.json()) as HealthResponse;

		expect(response.status).toBe(200);
		expect(body).toMatchObject({ ok: true, discord: "ready", database: "connected" });
		expect(body.uptimeMs).toBeGreaterThan(0);
	});

	/** A dashboard that says "ok" while the database is down would send every later request into a timeout. */
	it("is not ok when the database is disconnected", async () => {
		connected.mockReturnValue(false);

		const body = (await (await apiFor(readyClient()).request("/api/health")).json()) as HealthResponse;

		expect(body).toMatchObject({ ok: false, database: "disconnected" });
	});

	it("is not ok while the gateway is still connecting", async () => {
		connected.mockReturnValue(true);

		const body = (await (await apiFor(readyClient(false)).request("/api/health")).json()) as HealthResponse;

		expect(body).toMatchObject({ ok: false, discord: "connecting" });
	});
});

describe("the error boundary", () => {
	/** Without the boundary a throwing route leaves the request hanging, with nothing to say what happened. */
	it("turns a throwing route into a 500 rather than letting it escape", async () => {
		const client = readyClient();
		const logged = jest.spyOn(client.logger, "error");
		const app = apiFor(client);
		app.get("/api/boom", () => {
			throw new Error("a secret internal path");
		});

		const response = await app.request("/api/boom");
		const body = (await response.json()) as ApiErrorBody;

		expect(response.status).toBe(500);
		expect(body.error.code).toBe("internal");
		expect(body.error.message).not.toContain("secret");
		expect(logged).toHaveBeenCalled();
	});

	it("answers an unknown path with the same error shape", async () => {
		const response = await apiFor(readyClient()).request("/api/nope");
		const body = (await response.json()) as ApiErrorBody;

		expect(response.status).toBe(404);
		expect(body.error.code).toBe("not_found");
	});
});

/**
 * Each settings screen adds one `guilds.route(…)` line, and forgetting it fails silently: the request falls
 * through to the SPA catch-all and the browser lands back on the guild picker with nothing to explain why.
 *
 * A request cannot tell the two apart, because `requireGuild` refuses an anonymous caller before the router
 * decides there is no handler — so this reads the route table instead.
 */
describe("the guild settings sub-routes", () => {
	function pathsOf(method: string): string[] {
		return apiFor(readyClient())
			.routes.filter((route) => route.method === method)
			.map((route) => route.path);
	}

	it.each([
		["GET", "/api/guilds/:guildId/levelling"],
		["GET", "/api/guilds/:guildId/welcome"],
		["GET", "/api/guilds/:guildId/audit-log"],
		["PUT", "/api/guilds/:guildId/audit-log"],
		["GET", "/api/guilds/:guildId/settings"],
		["PATCH", "/api/guilds/:guildId/settings/prefix"],
		["PATCH", "/api/guilds/:guildId/settings/anti-link"],
		["PUT", "/api/guilds/:guildId/settings/auto-roles"],
		["PATCH", "/api/guilds/:guildId/settings/counting"],
		["PATCH", "/api/guilds/:guildId/settings/voice-stats"],

		["GET", "/api/guilds/:guildId/verification"],
		["PATCH", "/api/guilds/:guildId/verification"],
		["GET", "/api/guilds/:guildId/automod"],
		["POST", "/api/guilds/:guildId/automod"],
		["PATCH", "/api/guilds/:guildId/automod/:ruleId"],
		["DELETE", "/api/guilds/:guildId/automod/:ruleId"],
		["GET", "/api/guilds/:guildId/sticky"],
		["PUT", "/api/guilds/:guildId/sticky"],
		["DELETE", "/api/guilds/:guildId/sticky/:channelId"],
		["GET", "/api/guilds/:guildId/treasure"],
		["PATCH", "/api/guilds/:guildId/treasure"],
		["POST", "/api/guilds/:guildId/treasure/reset"],
		["GET", "/api/guilds/:guildId/giveaways"],
		["POST", "/api/guilds/:guildId/giveaways"],
		["POST", "/api/guilds/:guildId/giveaways/:messageId/end"],
		["POST", "/api/guilds/:guildId/giveaways/:messageId/reroll"],
		["DELETE", "/api/guilds/:guildId/giveaways/:messageId"],
		["GET", "/api/guilds/:guildId/tickets"],
		["PATCH", "/api/guilds/:guildId/tickets"],
		["DELETE", "/api/guilds/:guildId/tickets"],
		["GET", "/api/guilds/:guildId/lottery"],
		["PATCH", "/api/guilds/:guildId/lottery"],
		["DELETE", "/api/guilds/:guildId/lottery"],
		["GET", "/api/guilds/:guildId/members/leaderboard"],
		["GET", "/api/guilds/:guildId/members/:userId"],
		["POST", "/api/guilds/:guildId/members/:userId/warnings"],
		["DELETE", "/api/guilds/:guildId/members/:userId/warnings"],
		["DELETE", "/api/guilds/:guildId/members/:userId/warnings/:warnId"],
		["PATCH", "/api/guilds/:guildId/members/:userId/level"],
		["PATCH", "/api/guilds/:guildId/members/:userId/money"],
		["DELETE", "/api/guilds/:guildId/members/:userId/softban"],
		["GET", "/api/owner/runner"],
		["POST", "/api/owner/runner/:name"],
		["GET", "/api/owner/blacklist"],
		["POST", "/api/owner/blacklist"],
		["DELETE", "/api/owner/blacklist/:userId"],
		["POST", "/api/control/guilds/:guildId/leave"],
		["GET", "/api/analytics/usage"],
		["GET", "/api/analytics/logs"],
		["GET", "/api/analytics/runtime"],
		["POST", "/api/screens"],
	])("mounts %s %s", (method, path) => {
		expect(pathsOf(method)).toContain(path);
	});
});

describe("startApi", () => {
	/**
	 * Port 0 asks the operating system for a free one, so this cannot collide with a real bot or with another
	 * test run on the same machine.
	 */
	function listen(client: TestifyClient): ReturnType<typeof startApi> {
		return startApi(client, { DASHBOARD_PORT: 0, DASHBOARD_BIND: "127.0.0.1" } as Env);
	}

	it("serves the routes it was built with", async () => {
		connected.mockReturnValue(true);
		const running = listen(readyClient());

		try {
			const response = await fetch(`http://127.0.0.1:${String(await running.ready)}/api/health`);
			expect(((await response.json()) as HealthResponse).ok).toBe(true);
		} finally {
			await running.close();
		}
	});

	/** `shutdown()` closes `client.api`, so a listener the client does not know about is never closed. */
	it("hands the client something shutdown can close", async () => {
		const client = readyClient();
		const running = listen(client);
		await running.ready;

		expect(client.api).toBe(running);
		await expect(running.close()).resolves.toBeUndefined();
	});

	/** The bound port is not the address to open in development, and the log said only the bound port. */
	it("logs where the dashboard is opened alongside where the API listens", async () => {
		const client = readyClient();
		const logged = jest.spyOn(client.logger, "info");
		const running = startApi(client, {
			DASHBOARD_PORT: 0,
			DASHBOARD_BIND: "127.0.0.1",
			DASHBOARD_ENABLED: true,
			DASHBOARD_BASE_URL: "http://localhost:5174",
		} as Env);

		try {
			await running.ready;
			expect(logged).toHaveBeenCalledWith(
				expect.objectContaining({ open: "http://localhost:5174" }),
				expect.stringContaining("[DASHBOARD]"),
			);
		} finally {
			await running.close();
		}
	});

	it("refuses a request once it has been closed", async () => {
		const running = listen(readyClient());
		const port = await running.ready;
		await running.close();

		await expect(fetch(`http://127.0.0.1:${String(port)}/api/health`)).rejects.toThrow();
	});
});

async function waitFor(condition: () => boolean, timeoutMs = 2_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (!condition()) {
		if (Date.now() > deadline) throw new Error("condition never became true");
		await new Promise((done) => setTimeout(done, 10));
	}
}

describe("a port that cannot be listened on", () => {
	/**
	 * An unhandled `error` event on a Node server throws, so a busy port used to reach `uncaughtException` and
	 * take the whole bot down — for the optional half of it, and with a message that never named the port.
	 */
	it("rejects `ready` and logs advice rather than throwing", async () => {
		const held = startApi(readyClient(), { DASHBOARD_PORT: 0, DASHBOARD_BIND: "127.0.0.1" } as Env);
		const port = await held.ready;

		const client = readyClient();
		const logged = jest.spyOn(client.logger, "error");
		const clash = startApi(client, { DASHBOARD_PORT: port, DASHBOARD_BIND: "127.0.0.1" } as Env, { retries: 0 });

		try {
			await expect(clash.ready).rejects.toThrow();
			expect(logged).toHaveBeenCalledWith(expect.objectContaining({ port }), expect.stringContaining("already in use"));
		} finally {
			await held.close();
			await clash.close();
		}
	});

	/**
	 * `tsx watch` starts the new bot before the old one has released the port, so the dashboard used to stay
	 * down for the rest of the run over a clash that resolves itself in a second.
	 */
	it("comes up on its own once the port is released", async () => {
		const held = startApi(readyClient(), { DASHBOARD_PORT: 0, DASHBOARD_BIND: "127.0.0.1" } as Env);
		const port = await held.ready;

		const client = readyClient();
		const waiting = jest.spyOn(client.logger, "warn");
		const second = startApi(client, { DASHBOARD_PORT: port, DASHBOARD_BIND: "127.0.0.1" } as Env, {
			retryDelayMs: 25,
		});
		// Settled here rather than awaited later: an unhandled rejection outlives the test that caused it.
		const outcome = second.ready.then(
			() => "listening",
			() => "gave up",
		);

		try {
			// The clash has to have happened before the port is given up, or there was nothing to retry.
			await waitFor(() => waiting.mock.calls.length > 0);
			expect(waiting).toHaveBeenCalledWith(expect.objectContaining({ port }), expect.stringContaining("still busy"));

			await held.close();
			await expect(outcome).resolves.toBe("listening");
		} finally {
			await held.close();
			await second.close();
		}
	});

	/** Waiting cannot conjure a privilege, so retrying one would only delay the line that says what to do. */
	it("does not retry a failure that waiting cannot fix", () => {
		expect(worthRetrying({ code: "EADDRINUSE" } as NodeJS.ErrnoException)).toBe(true);
		expect(worthRetrying({ code: "EACCES" } as NodeJS.ErrnoException)).toBe(false);
	});

	it("stops retrying when the bot shuts down first", async () => {
		const held = startApi(readyClient(), { DASHBOARD_PORT: 0, DASHBOARD_BIND: "127.0.0.1" } as Env);
		const port = await held.ready;

		const client = readyClient();
		const second = startApi(client, { DASHBOARD_PORT: port, DASHBOARD_BIND: "127.0.0.1" } as Env, {
			retryDelayMs: 10,
		});
		second.ready.catch(() => undefined);

		await new Promise((done) => setTimeout(done, 30));
		await expect(second.close()).resolves.toBeUndefined();
		await held.close();

		const listening = jest.spyOn(client.logger, "info");
		await new Promise((done) => setTimeout(done, 40));
		expect(listening).not.toHaveBeenCalled();
	});
});

describe("listenAdvice", () => {
	it.each([
		["EADDRINUSE", /already in use/i],
		["EACCES", /elevated privileges/i],
		["EPIPE", /could not start listening/i],
	])("names what to do about %s", (code, expected) => {
		expect(listenAdvice({ code } as NodeJS.ErrnoException, 3_000)).toMatch(expected);
	});

	/** Whatever went wrong, the operator has to know the commands still work. */
	it.each(["EADDRINUSE", "EACCES", "EPIPE"])("says the bot is still running for %s", (code) => {
		expect(listenAdvice({ code } as NodeJS.ErrnoException, 3_000)).toMatch(/bot is running without/i);
	});
});
