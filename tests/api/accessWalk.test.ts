import { Collection, PermissionFlagsBits } from "discord.js";
import mongoose from "mongoose";
import { createApi } from "@api/server";
import { type TestifyClient } from "@core/client";
import { findSession } from "@database/repositories/dashboardSessionRepository";
import { type Answer, API_ENV, ask, askRaw, sessionOf } from "@tests/helpers/apiHarness";
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
const MANAGES_ONLY = "100000000000000005";

/** Reachable without signing in, on purpose: each one is named so a new public route is a decision, not an accident. */
const PUBLIC = new Set([
	"GET /api/health",
	"GET /api/bot",
	"GET /api/auth/setup",
	"GET /api/auth/login",
	"GET /api/auth/callback",
	"GET /api/support",
	"GET /api/support/articles/:articleId",
	"GET /api/site",
	"GET /api/site/repository",
	"GET /api/site/traffic",
	"GET /api/site/tree",
	"GET /api/site/file",
]);
const OWNER_ONLY = ["/api/owner/", "/api/analytics/", "/api/control/"];
const GUILD_SCOPED = "/api/guilds/:guildId/";

/** Each asks what its Discord command asks on top of Manage Server, so gaining or losing a gate is decided here. */
const ASKS_MORE = new Set([
	"GET /bans",
	"POST /bans/:userId/unban",
	"GET /cases",
	"GET /channel-tools",
	"PATCH /channel-tools/:channelId",
	"PUT /levelling/rewards",
	"PATCH /members/:userId/level",
	"PATCH /members/:userId/money",
	"POST /members/:userId/kick",
	"POST /members/:userId/ban",
	"DELETE /members/:userId/softban",
	"POST /members/:userId/timeout",
	"DELETE /members/:userId/timeout",
	"PATCH /members/:userId/nickname",
	"GET /members/:userId/roles",
	"PUT /members/:userId/roles",
	"PATCH /raid-protection",
	"POST /role-menus",
	"PUT /role-menus/:menuId",
	"POST /role-menus/:menuId/publish",
	"DELETE /role-menus/:menuId",
	"PATCH /settings/nickname",
	"PUT /settings/auto-roles",
	"POST /temp-voice/lobby",
	"GET /warnings",
	"POST /warnings",
	"PATCH /warnings/:userId/:warnId",
	"DELETE /warnings/:userId/:warnId",
	"DELETE /warnings/:userId",
]);

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
				if (id === MANAGES_ONLY) {
					const has = (flags: bigint | bigint[]) =>
						[flags].flat().every((flag) => flag === PermissionFlagsBits.ManageGuild);
					return Promise.resolve({ permissions: { has } });
				}
				return Promise.reject(new Error("Unknown Member"));
			},
		},
	};

	return createMockClient({
		guilds: { cache: new Collection([[GUILD, guild]]) },
		isOwner: (id: string) => id === OWNER,
	} as unknown as Partial<TestifyClient>);
}

interface Route {
	method: string;
	pattern: string;
	path: string;
}

function routesOf(app: ReturnType<typeof createApi>): Route[] {
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

beforeAll(() => {
	// The one request that passes the gate meets no database, and should fail at once rather than wait ten seconds.
	mongoose.set("bufferCommands", false);
});

beforeEach(() => {
	jest
		.mocked(findSession)
		.mockImplementation((id: string) =>
			Promise.resolve([OWNER, MANAGER, MEMBER, OUTSIDER, MANAGES_ONLY].includes(id) ? sessionOf(id) : null),
		);
});

const all = routesOf(createApi(clientFor(), API_ENV));
const gated = all.filter((route) => !PUBLIC.has(`${route.method} ${route.pattern}`));
const guildScoped = all.filter((route) => route.pattern.startsWith(GUILD_SCOPED));
const ownerOnly = all.filter((route) => OWNER_ONLY.some((prefix) => route.pattern.startsWith(prefix)));

/** Asks every route as one caller, on one app, and names each route whose answer was not the refusal expected. */
async function letThrough(routes: Route[], who: string | null, refusal: Partial<Answer>): Promise<string[]> {
	const app = createApi(clientFor(), API_ENV);
	const answers = await Promise.all(
		routes.map(async (route) => ({ route, answer: await ask(app, who, route.method, route.path) })),
	);

	return answers
		.filter(({ answer }) => Object.entries(refusal).some(([key, value]) => answer[key as keyof Answer] !== value))
		.map(
			({ route, answer }) => `${route.method} ${route.pattern} answered ${String(answer.status)} ${answer.code ?? ""}`,
		);
}

describe("walking every route in the dashboard's API", () => {
	it("finds them all, so nothing below passes by testing nothing", () => {
		expect(all.length).toBeGreaterThan(80);
		expect(guildScoped.length).toBeGreaterThan(40);
		expect(ownerOnly.length).toBeGreaterThan(15);
		// Every public route still exists; a renamed one would otherwise leave a stale exemption behind.
		for (const exempt of PUBLIC) expect(all.map((route) => `${route.method} ${route.pattern}`)).toContain(exempt);
	});

	it("refuses somebody signed out on every route that is not public", async () => {
		expect(await letThrough(gated, null, { status: 401 })).toEqual([]);
	});

	it("refuses a member without Manage Server on every server route", async () => {
		expect(await letThrough(guildScoped, MEMBER, { status: 403, code: "missing_manage_guild" })).toEqual([]);
	});

	it("refuses somebody who is not in the server on every server route", async () => {
		expect(await letThrough(guildScoped, OUTSIDER, { status: 403, code: "not_a_member" })).toEqual([]);
	});

	it("refuses a server manager on every one of the owner's routes", async () => {
		expect(await letThrough(ownerOnly, MANAGER, { status: 404, code: "not_found" })).toEqual([]);
	});

	/** A Manage Server manager once kicked, banned, warned and read every warning from the web, as Discord would not. */
	it("refuses a manager with only Manage Server wherever the matching command asks for more, and nowhere else", async () => {
		const app = createApi(clientFor(), API_ENV);
		const answers = await Promise.all(
			guildScoped.map(async (route) => ({ route, answer: await ask(app, MANAGES_ONLY, route.method, route.path) })),
		);
		const refused = answers
			.filter(({ answer }) => answer.status === 403 && answer.code === "missing_permission")
			.map(({ route }) => `${route.method} ${route.pattern.slice(GUILD_SCOPED.length - 1)}`);

		expect(refused.sort()).toEqual([...ASKS_MORE].sort());
	});

	it("lets a manager past the gate, so the refusals above are the gate's and not a broken harness", async () => {
		const app = createApi(clientFor(), API_ENV);
		const { status } = await ask(app, MANAGER, "GET", `/api/guilds/${GUILD}/overview`);

		expect([401, 403]).not.toContain(status);
	});
});

describe("a hostile body on every write to a server", () => {
	const writes = guildScoped.filter((route) => route.method !== "GET");
	// Written out as text, since building it with `JSON.stringify` would overflow this test's own stack first.
	const deep = `${'{"a":'.repeat(10_000)}1${"}".repeat(10_000)}`;
	const polluting = '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}';

	it("is refused rather than crashing anything, however deep it is nested", async () => {
		const app = createApi(clientFor(), API_ENV);
		const answers = await Promise.all(
			writes.map(async (route) => ({ route, answer: await askRaw(app, MANAGER, route.method, route.path, deep) })),
		);

		expect(answers.filter(({ answer }) => answer.status !== 400).map(({ route }) => route.pattern)).toEqual([]);
	});

	it("never reaches Object.prototype", async () => {
		const app = createApi(clientFor(), API_ENV);
		await Promise.all(writes.map((route) => askRaw(app, MANAGER, route.method, route.path, polluting)));

		expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
		expect(writes.length).toBeGreaterThan(60);
	});
});
