import { createApi } from "@api/server";
import { type Env } from "@config/env";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));

/**
 * The one test that a new route cannot slip past.
 *
 * Hiding a control in the browser is never access control — anybody can edit a class name, call the endpoint
 * directly, or read the JavaScript bundle. This walks the real route table and asserts that every path is
 * either deliberately public or answers an anonymous caller with a refusal.
 */

/** Reachable without a session, on purpose. Each entry says why, because that is the thing worth reviewing. */
const PUBLIC = new Map<string, string>([
	["/api/health", "a liveness probe, and it carries no guild or user data"],
	["/api/auth/setup", "the setup screen for a half-configured install, before anybody can sign in"],
	["/api/auth/login", "the start of the sign-in flow"],
	["/api/auth/callback", "the end of the sign-in flow"],
	["/api/auth/me", "answers 401 with a shape the sign-in screen reads"],
	["/api/auth/logout", "signing out cannot require being signed in to work"],
	["/api/bot", "the bot's public profile, needed by the sign-in screen before a session exists"],
]);

function api() {
	return createApi(createMockClient({ isReady: jest.fn(() => true) } as never), {
		DASHBOARD_PORT: 3_000,
		DASHBOARD_BIND: "127.0.0.1",
	} as Env);
}

/** Concrete enough to route: the parameters are replaced with a real snowflake. */
function concrete(path: string): string {
	return path.replaceAll(/:[a-zA-Z]+/g, "900000000000000001").replace(/\/\*$/, "");
}

function routes(): { method: string; path: string }[] {
	const seen = new Set<string>();

	return api()
		.routes.filter((route) => route.path.startsWith("/api/") && route.method !== "ALL")
		.filter((route) => {
			const key = `${route.method} ${route.path}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.map((route) => ({ method: route.method, path: route.path }));
}

describe("every API route", () => {
	it("has some routes to check, so this cannot pass by finding none", () => {
		expect(routes().length).toBeGreaterThan(20);
	});

	it("refuses an anonymous caller unless it is deliberately public", async () => {
		const app = api();
		const leaks: string[] = [];

		for (const route of routes()) {
			if (PUBLIC.has(route.path)) continue;

			const response = await app.request(concrete(route.path), {
				method: route.method,
				headers: { "content-type": "application/json" },
				...(route.method === "GET" || route.method === "HEAD" ? {} : { body: "{}" }),
			});

			// 401 unauthenticated, 403 refused, 404 hidden — anything else means it ran without a session.
			if (![401, 403, 404].includes(response.status)) {
				leaks.push(`${route.method} ${route.path} answered ${String(response.status)}`);
			}
		}

		expect(leaks).toEqual([]);
	});

	/** A public route added without a reason is the thing this list exists to make somebody argue for. */
	it("keeps the public list short and explained", () => {
		for (const [path, why] of PUBLIC) {
			expect(why.length).toBeGreaterThan(10);
			expect(path.startsWith("/api/")).toBe(true);
		}

		expect(PUBLIC.size).toBeLessThanOrEqual(8);
	});
});
