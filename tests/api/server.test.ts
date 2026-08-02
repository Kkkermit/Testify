import { createApi, startApi } from "@api/server";
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
	/**
	 * `shutdown.ts` kills the process on an uncaught exception, which is right for a bot and would let one bad
	 * route take the whole bot offline.
	 */
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
		["GET", "/api/analytics/usage"],
		["GET", "/api/analytics/logs"],
		["GET", "/api/analytics/runtime"],
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
