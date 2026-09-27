import { Collection, PermissionFlagsBits } from "discord.js";
import { createApi } from "@api/server";
import { type TestifyClient } from "@core/client";
import { findSession } from "@database/repositories/dashboardSessionRepository";
import { API_ENV, ask, sessionOf } from "@tests/helpers/apiHarness";
import { createMockClient } from "@tests/helpers/mocks";

/** Every route in the real app, asked by somebody it should refuse; a route added without its gate fails here. */

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));
jest.mock("@database/repositories/dashboardSessionRepository", () => ({
	...jest.requireActual<object>("@database/repositories/dashboardSessionRepository"),
	findSession: jest.fn(),
	touchSession: jest.fn(() => Promise.resolve()),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const MEMBER = "100000000000000003";
const OUTSIDER = "100000000000000004";

/** Reachable without signing in, on purpose: each one is named so a new public route is a decision, not an accident. */
const PUBLIC = new Set([
	"GET /api/health",
	"GET /api/bot",
	"GET /api/auth/setup",
	"GET /api/auth/login",
	"GET /api/auth/callback",
]);
const OWNER_ONLY = ["/api/owner/", "/api/analytics/", "/api/control/"];
const GUILD_SCOPED = "/api/guilds/:guildId/";

function clientFor(): TestifyClient {
	const member = (manages: boolean) => ({
		permissions: { has: (flag: bigint) => manages || flag !== PermissionFlagsBits.ManageGuild },
	});
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: {
			fetch: (id: string) => {
				if (id === MANAGER) return Promise.resolve(member(true));
				if (id === MEMBER) return Promise.resolve(member(false));
				return Promise.reject(new Error("Unknown Member"));
			},
		},
	};

	return createMockClient({
		guilds: { cache: new Collection([[GUILD, guild]]) },
		isOwner: (id: string) => id === OWNER,
	} as unknown as Partial<TestifyClient>);
}

function routesOf(app: ReturnType<typeof createApi>): { method: string; pattern: string; path: string }[] {
	const seen = new Set<string>();
	return app.routes
		.filter((route) => route.method !== "ALL" && !route.path.includes("*") && route.path.startsWith("/api/"))
		.map((route) => ({
			method: route.method,
			pattern: route.path,
			path: route.path
				.replace(/:guildId|:userId/g, (name) => (name === ":guildId" ? GUILD : OUTSIDER))
				.replace(/:\w+/g, "ping"),
		}))
		.filter((route) => {
			const key = `${route.method} ${route.pattern}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

beforeEach(() => {
	jest
		.mocked(findSession)
		.mockImplementation((id: string) =>
			Promise.resolve([OWNER, MANAGER, MEMBER, OUTSIDER].includes(id) ? sessionOf(id) : null),
		);
});

const all = routesOf(createApi(clientFor(), API_ENV));
const gated = all.filter((route) => !PUBLIC.has(`${route.method} ${route.pattern}`));
const guildScoped = all.filter((route) => route.pattern.startsWith(GUILD_SCOPED));
const ownerOnly = all.filter((route) => OWNER_ONLY.some((prefix) => route.pattern.startsWith(prefix)));

describe("walking every route in the dashboard's API", () => {
	it("finds them all, so nothing below passes by testing nothing", () => {
		expect(all.length).toBeGreaterThan(80);
		expect(guildScoped.length).toBeGreaterThan(40);
		expect(ownerOnly.length).toBeGreaterThan(15);
		// Every public route still exists; a renamed one would otherwise leave a stale exemption behind.
		for (const exempt of PUBLIC) expect(all.map((route) => `${route.method} ${route.pattern}`)).toContain(exempt);
	});

	it.each(gated)("refuses somebody signed out: $method $pattern", async ({ method, path }) => {
		const app = createApi(clientFor(), API_ENV);

		expect(await ask(app, null, method, path)).toMatchObject({ status: 401 });
	});

	it.each(guildScoped)("refuses a member without Manage Server: $method $pattern", async ({ method, path }) => {
		const app = createApi(clientFor(), API_ENV);

		expect(await ask(app, MEMBER, method, path)).toMatchObject({ status: 403, code: "missing_manage_guild" });
	});

	it.each(guildScoped)("refuses somebody who is not in the server: $method $pattern", async ({ method, path }) => {
		const app = createApi(clientFor(), API_ENV);

		expect(await ask(app, OUTSIDER, method, path)).toMatchObject({ status: 403, code: "not_a_member" });
	});

	it.each(ownerOnly)("refuses a server manager on the owner's routes: $method $pattern", async ({ method, path }) => {
		const app = createApi(clientFor(), API_ENV);

		expect(await ask(app, MANAGER, method, path)).toMatchObject({ status: 404, code: "not_found" });
	});

	it("lets a manager past the gate, so the refusals above are the gate's and not a broken harness", async () => {
		const app = createApi(clientFor(), API_ENV);
		const { status } = await ask(app, MANAGER, "GET", `/api/guilds/${GUILD}/overview`);

		expect([401, 403]).not.toContain(status);
	});
});
