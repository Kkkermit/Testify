import { Collection, PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { requireGuild, requireOwner } from "@api/middleware/session";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const MEMBER = "100000000000000003";
const GUILD = "900000000000000001";

interface Fake {
	membersInGuild: Set<string>;
	managers: Set<string>;
	botInGuild: boolean;
	fetched: string[];
}

function clientFor(fake: Fake): TestifyClient {
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: {
			fetch: (userId: string) => {
				fake.fetched.push(userId);
				if (!fake.membersInGuild.has(userId)) return Promise.reject(new Error("Unknown Member"));

				return Promise.resolve({
					id: userId,
					permissions: { has: (flag: bigint) => flag === PermissionFlagsBits.ManageGuild && fake.managers.has(userId) },
				});
			},
		},
	};

	const cache = new Collection<string, unknown>();
	if (fake.botInGuild) cache.set(GUILD, guild);

	return { guilds: { cache }, isOwner: (id: string) => id === OWNER } as unknown as TestifyClient;
}

/** Mirrors how `createApi` maps a thrown problem, so these exercise the real refusal path. */
function appFor(fake: Fake, userId: string | null) {
	const app = new Hono<ApiBindings>();

	app.use("*", async (context, next) => {
		context.set("client", clientFor(fake));
		context.set("env", {} as Env);
		context.set("oauth", null);
		if (userId !== null) {
			context.set("session", { _id: "s", userId } as never);
		}
		await next();
	});

	app.get("/guilds/:guildId/thing", requireGuild, (context) => context.json({ guild: context.get("guild")?.id }));
	app.get("/owner/thing", requireOwner, (context) => context.json({ ok: true }));

	app.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return app;
}

function fake(overrides: Partial<Fake> = {}): Fake {
	return {
		membersInGuild: new Set([MANAGER, MEMBER]),
		managers: new Set([MANAGER]),
		botInGuild: true,
		fetched: [],
		...overrides,
	};
}

async function codeOf(response: Response): Promise<string> {
	return ((await response.json()) as { error: { code: string } }).error.code;
}

describe("requireGuild", () => {
	it("lets a manager through", async () => {
		const response = await appFor(fake(), MANAGER).request(`/guilds/${GUILD}/thing`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ guild: GUILD });
	});

	it("refuses a member without Manage Server", async () => {
		const response = await appFor(fake(), MEMBER).request(`/guilds/${GUILD}/thing`);

		expect(response.status).toBe(403);
		expect(await codeOf(response)).toBe("missing_manage_guild");
	});

	it("refuses someone who is not in the guild at all", async () => {
		const response = await appFor(fake({ membersInGuild: new Set() }), MEMBER).request(`/guilds/${GUILD}/thing`);

		expect(response.status).toBe(403);
		expect(await codeOf(response)).toBe("not_a_member");
	});

	/** Not being in the guild is not a secret, and "here is an invite" is the right answer to it. */
	it("says 404 when the bot is not in the guild, before checking anything about the user", async () => {
		const response = await appFor(fake({ botInGuild: false }), MANAGER).request(`/guilds/${GUILD}/thing`);

		expect(response.status).toBe(404);
		expect(await codeOf(response)).toBe("guild_not_found");
	});

	/** 403 for a guild the user cannot manage must not leak its name or icon — a code and nothing else. */
	it("leaks nothing about a guild it refuses", async () => {
		const body = await (await appFor(fake(), MEMBER).request(`/guilds/${GUILD}/thing`)).text();

		expect(body).not.toContain("Test Server");
	});

	it("refuses anyone who is not signed in", async () => {
		const response = await appFor(fake(), null).request(`/guilds/${GUILD}/thing`);

		expect(response.status).toBe(401);
	});

	/**
	 * The OAuth guild list is a login-time snapshot. Someone demoted five minutes ago still has it in their
	 * session, so the member has to be fetched live on every request or the dashboard fails open.
	 */
	it("fetches the member live rather than trusting the session", async () => {
		const state = fake();
		await appFor(state, MANAGER).request(`/guilds/${GUILD}/thing`);
		await appFor(state, MANAGER).request(`/guilds/${GUILD}/thing`);

		expect(state.fetched).toEqual([MANAGER, MANAGER]);
	});

	it("refuses on the next request after a demotion", async () => {
		const state = fake();
		expect((await appFor(state, MANAGER).request(`/guilds/${GUILD}/thing`)).status).toBe(200);

		state.managers.delete(MANAGER);
		expect((await appFor(state, MANAGER).request(`/guilds/${GUILD}/thing`)).status).toBe(403);
	});

	/** Requiring the bot owner to join a server before they can support someone would be absurd. */
	it("lets a bot owner through without being in the guild", async () => {
		const state = fake({ membersInGuild: new Set(), managers: new Set() });
		const response = await appFor(state, OWNER).request(`/guilds/${GUILD}/thing`);

		expect(response.status).toBe(200);
		expect(state.fetched).toEqual([]);
	});

	/**
	 * An id straight out of a URL reaches a Mongo filter if nothing checks it first. The assertion is on the
	 * code and not the status, because a cache miss produces a 404 too — only the shape check produces this.
	 */
	it("rejects a guild id that is not a snowflake before it is used to look anything up", async () => {
		for (const id of ["nope", "1", "abc123", "12345678901234567890123", "9007199254740993x"]) {
			const response = await appFor(fake(), MANAGER).request(`/guilds/${id}/thing`);

			expect(response.status).toBe(404);
			expect(await codeOf(response)).toBe("bad_guild_id");
		}
	});
});

describe("requireOwner", () => {
	it("lets the bot owner in", async () => {
		expect((await appFor(fake(), OWNER).request("/owner/thing")).status).toBe(200);
	});

	/**
	 * 404 rather than 403: a server manager has no business learning that an owner console exists here, and the
	 * console can leave guilds and blacklist people.
	 */
	it("does not confirm to a manager that the console exists", async () => {
		const response = await appFor(fake(), MANAGER).request("/owner/thing");

		expect(response.status).toBe(404);
		expect(await codeOf(response)).toBe("not_found");
	});

	it("refuses anyone who is not signed in", async () => {
		expect((await appFor(fake(), null).request("/owner/thing")).status).toBe(401);
	});
});
