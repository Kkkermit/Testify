import { createApi } from "@api/server";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));

/**
 * A blanket guard over the whole surface rather than one assertion per route: a key added to a response next
 * year is checked by this without anybody remembering to check it.
 *
 * The same shape as `logRing`'s redaction list, so a field that would be scrubbed out of a log line cannot be
 * served in full from a route.
 */
const SECRET_KEY = /token|secret|password|credential|authorization|cookie|csrf|uri|dsn|key$/i;

/** Values the environment holds that must never appear in a body, whatever they are called. */
const SECRETS = {
	DISCORD_TOKEN: "bot-token-value-never-served",
	DISCORD_CLIENT_SECRET: "client-secret-never-served",
	MONGODB_URI: "mongodb+srv://user:pw@cluster0.example.mongodb.net/testify",
	DASHBOARD_SESSION_SECRET: "session-secret-never-served",
};

function keysIn(value: unknown, path = "", found: string[] = []): string[] {
	if (Array.isArray(value)) {
		value.forEach((entry, index) => keysIn(entry, `${path}[${String(index)}]`, found));
		return found;
	}
	if (value !== null && typeof value === "object") {
		for (const [key, nested] of Object.entries(value)) {
			const where = path === "" ? key : `${path}.${key}`;
			if (SECRET_KEY.test(key)) found.push(where);
			keysIn(nested, where, found);
		}
	}
	return found;
}

const env = {
	DASHBOARD_PORT: 3_000,
	DASHBOARD_BIND: "127.0.0.1",
	DASHBOARD_ENABLED: true,
	...SECRETS,
} as unknown as Env;

function api(): ReturnType<typeof createApi> {
	const client: TestifyClient = createMockClient({
		isReady: () => true,
		user: {
			id: "100000000000000001",
			username: "Testify",
			displayAvatarURL: () => "https://cdn.discordapp.com/avatars/1/abc.png",
			bannerURL: () => null,
			accentColor: null,
			fetch: jest.fn().mockResolvedValue(undefined),
		},
	} as never);

	return createApi(client, env);
}

/** Reachable without a session, so anything they carry is readable by anyone who can reach the port. */
const PUBLIC = ["/api/health", "/api/bot"];

describe("no route serves a secret", () => {
	it.each(PUBLIC)("keeps secret-shaped keys out of %s", async (path) => {
		const body: unknown = await (await api().request(path)).json();

		expect(keysIn(body)).toEqual([]);
	});

	it.each(PUBLIC)("keeps the environment's own values out of %s", async (path) => {
		const text = await (await api().request(path)).text();

		for (const secret of Object.values(SECRETS)) expect(text).not.toContain(secret);
	});

	/**
	 * Everything else answers 401 without a session, and a refusal must not describe what it is refusing —
	 * a stack, a path or a config value in an error body is the other way this leaks.
	 */
	it.each([
		"/api/auth/me",
		"/api/commands",
		"/api/owner/stats",
		"/api/analytics/usage",
		"/api/analytics/logs",
		"/api/control",
		"/api/guilds/900000000000000001/levelling",
		"/api/guilds/900000000000000001/settings",
	])("refuses %s without a session and says nothing else", async (path) => {
		const response = await api().request(path);
		const text = await response.text();

		expect(response.status).toBeGreaterThanOrEqual(401);
		expect(keysIn(JSON.parse(text))).toEqual([]);
		for (const secret of Object.values(SECRETS)) expect(text).not.toContain(secret);
		expect(text).not.toMatch(/at .*\(.*:\d+:\d+\)/);
	});
});

/** The refusal carries a stable code and nothing a caller could probe with. */
describe("an error body", () => {
	it("carries a code and a message, never a stack or a path", async () => {
		const body = (await (await api().request("/api/auth/me")).json()) as { error: Record<string, unknown> };

		expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
		expect(JSON.stringify(body)).not.toContain("/home/");
		expect(JSON.stringify(body)).not.toContain("node_modules");
	});
});
