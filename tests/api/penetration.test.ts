import { Collection } from "discord.js";
import { type Context, Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { verifyCsrf } from "@api/middleware/csrf";
import { requireGuild, requireOwner } from "@api/middleware/session";
import { type TestifyClient } from "@core/client";
import { commandRunRequest, plainLine, plainText, returnTo as returnToSchema } from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

/**
 * The attacks, rather than the happy paths.
 *
 * Every case here is something an authenticated manager could actually send — a hand-written `fetch`, a
 * modified request in the browser's dev tools, a link from another site. The client-side half of the dashboard
 * is not a control at all: hiding a button changes nothing about what the server will accept, so each of these
 * goes at the server.
 */

const GUILD = "900000000000000001";
const OTHER_GUILD = "900000000000000002";
const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";

function clientWith(guildIds: string[], owners: string[]): TestifyClient {
	const guilds = new Collection<string, unknown>();
	for (const id of guildIds) {
		guilds.set(id, {
			id,
			name: `Guild ${id}`,
			members: { fetch: () => Promise.reject(new Error("not a member")) },
		});
	}

	return createMockClient({
		guilds: { cache: guilds },
		isOwner: (id: string) => owners.includes(id),
	} as unknown as Partial<TestifyClient>);
}

/** The real middleware, with a session already attached — the state an attacker reaches after signing in. */
function appAs(userId: string, client: TestifyClient) {
	const app = new Hono<ApiBindings>();
	app.onError((error, context) =>
		error instanceof ApiProblem
			? context.json(problemBody(error), error.status as 400)
			: context.json({ error: { code: "internal", message: "boom" } }, 500),
	);
	app.use("*", async (context, next) => {
		context.set("client", client);
		context.set("session", { _id: "s", userId, csrfSecret: "secret" } as never);
		await next();
	});

	app.get("/owner/stats", requireOwner, (context) => context.json({ secret: "fleet" }));
	// `requireGuild` sets it, and the whole point of these cases is whether the request reaches this handler.
	const reached = (context: Context<ApiBindings>) => context.json({ id: context.get("guild")?.id ?? null });

	app.get("/guilds/:guildId/settings", requireGuild, reached);
	app.post("/guilds/:guildId/settings", requireGuild, reached);

	return app;
}

describe("reaching the owner console without being an owner", () => {
	it("answers 404 rather than 403, so the console's existence is not confirmed", async () => {
		const app = appAs(MANAGER, clientWith([GUILD], [OWNER]));

		const response = await app.request("/owner/stats");

		expect(response.status).toBe(404);
		expect(await response.text()).not.toContain("fleet");
	});

	/** Ownership is read from the env per request, so nothing carried on the session can grant it. */
	it("ignores an ownership claim smuggled onto the session", async () => {
		const client = clientWith([GUILD], [OWNER]);
		const app = new Hono<ApiBindings>();
		app.onError((error, context) => context.json(problemBody(error as ApiProblem), 404));
		app.use("*", async (context, next) => {
			context.set("client", client);
			context.set("session", { _id: "s", userId: MANAGER, isOwner: true, owner: true } as never);
			await next();
		});
		app.get("/owner/stats", requireOwner, (context) => context.json({ secret: "fleet" }));

		expect((await app.request("/owner/stats")).status).toBe(404);
	});

	/** A near-miss id must not match: a prefix or a suffix of an owner id is somebody else entirely. */
	it("refuses an id that only looks like an owner's", async () => {
		const client = clientWith([GUILD], [OWNER]);

		for (const near of [OWNER.slice(0, -1), `${OWNER}0`, ` ${OWNER}`, OWNER.replace("1", "2")]) {
			const app = appAs(near, client);

			expect((await app.request("/owner/stats")).status).toBe(404);
		}
	});
});

describe("reaching another server's data", () => {
	/** The guild id comes from the path and nowhere else, so a body field cannot redirect the write. */
	it("ignores a guild id in the body", async () => {
		const app = appAs(OWNER, clientWith([GUILD, OTHER_GUILD], [OWNER]));

		const response = await app.request(`/guilds/${GUILD}/settings`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ guildId: OTHER_GUILD }),
		});

		expect(await response.json()).toEqual({ id: GUILD });
	});

	it("refuses a manager who is not in the server at all", async () => {
		const app = appAs(MANAGER, clientWith([GUILD], [OWNER]));

		const response = await app.request(`/guilds/${GUILD}/settings`);

		expect(response.status).toBe(403);
	});

	/** A malformed id must be refused before it is used to look anything up. */
	it("refuses a guild id that is not a snowflake", async () => {
		const app = appAs(OWNER, clientWith([GUILD], [OWNER]));

		for (const bad of ["../owner", "1", "not-an-id", `${GUILD}'`, "%2e%2e"]) {
			const response = await app.request(`/guilds/${encodeURIComponent(bad)}/settings`);

			expect(response.status).toBe(404);
		}
	});
});

describe("CSRF", () => {
	function csrfApp() {
		const app = new Hono<ApiBindings>();
		app.onError((error, context) => context.json(problemBody(error as ApiProblem), 403));
		app.use("*", async (context, next) => {
			context.set("session", { _id: "s", userId: OWNER, csrfSecret: "secret" } as never);
			await next();
		});
		app.post("/write", verifyCsrf, (context) => context.json({ wrote: true }));
		return app;
	}

	it("refuses a write with no token at all", async () => {
		expect((await csrfApp().request("/write", { method: "POST" })).status).toBe(403);
	});

	/** The header alone is what another origin cannot set; a cookie it can make the browser send. */
	it("refuses a write with the cookie but no header", async () => {
		const response = await csrfApp().request("/write", {
			method: "POST",
			headers: { cookie: "dash_csrf=secret" },
		});

		expect(response.status).toBe(403);
	});

	it("refuses a header that does not match the session's own secret", async () => {
		const response = await csrfApp().request("/write", {
			method: "POST",
			headers: { cookie: "dash_csrf=guessed", "x-csrf-token": "guessed" },
		});

		expect(response.status).toBe(403);
	});
});

describe("hostile input", () => {
	/** `__proto__` survives `JSON.parse` as an own property; what must not happen is it reaching the prototype. */
	it("cannot pollute Object.prototype through a request body", () => {
		const parsed = commandRunRequest.safeParse(
			JSON.parse('{"args":{"__proto__":{"polluted":"yes"},"constructor":"x"}}') as unknown,
		);

		expect(({} as { polluted?: string }).polluted).toBeUndefined();
		expect(Object.prototype).not.toHaveProperty("polluted");
		if (parsed.success) expect(Object.getPrototypeOf(parsed.data.args)).not.toHaveProperty("polluted");
	});

	/** A Mongo operator object where a string is expected is the classic NoSQL injection. */
	it("refuses an operator object where a string belongs", () => {
		for (const payload of [{ $ne: null }, { $gt: "" }, { $where: "1==1" }, ["a"], 1]) {
			expect(plainLine(1, 50).safeParse(payload).success).toBe(false);
		}
	});

	/** Markup is refused rather than stripped, so a script tag cannot survive as text either. */
	it("refuses every script payload put through a text field", () => {
		const payloads = [
			"<script>alert(1)</script>",
			"<img src=x onerror=alert(1)>",
			"<svg/onload=alert(1)>",
			"<iframe src=javascript:alert(1)>",
			"<a href='javascript:alert(1)'>x</a>",
			"<style>@import'evil'</style>",
			"</textarea><script>alert(1)</script>",
		];

		for (const payload of payloads) {
			expect(plainText(1, 500).safeParse(payload).success).toBe(false);
		}
	});

	/** Trojan Source: a value that renders in a different order than it reads in the box that saved it. */
	it("strips bidi overrides and zero-width padding rather than storing them", () => {
		const parsed = plainText(1, 100).safeParse("safe‮txet neddih‬​​");

		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data).not.toMatch(/[\u202a-\u202e\u200b-\u200f]/);
		}
	});

	/** A value padded to the minimum with invisible characters must not pass as long enough. */
	it("measures length after the strip, not before", () => {
		expect(plainText(5, 100).safeParse("ab​​​​").success).toBe(false);
	});
});

describe("open redirect", () => {
	/** A browser resolves all of these away from this origin, whatever they look like. */
	it("refuses anything that leaves this origin", () => {
		const hostile = [
			"//evil.example",
			"///evil.example",
			"\\\\evil.example",
			"/\\evil.example",
			"https://evil.example",
			"http://evil.example",
			"javascript:alert(1)",
			"data:text/html,<script>alert(1)</script>",
			"\u3000//evil.example",
			"/%09/evil.example",
		];

		for (const value of hostile) {
			expect(returnToSchema.safeParse(value).success).toBe(false);
		}
	});

	it("still allows the in-app paths sign-in has to carry", () => {
		for (const value of ["/guilds", "/guilds/900000000000000001/levelling?tab=rewards", "/owner?tab=logs"]) {
			expect(returnToSchema.safeParse(value).success).toBe(true);
		}
	});
});
