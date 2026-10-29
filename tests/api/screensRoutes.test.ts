import { Collection, PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { screens } from "@api/routes/screens";
import { type TestifyClient } from "@core/client";
import { recordDashboardView, recordScreenView } from "@database/repositories/usageRepository";

jest.mock("@database/repositories/usageRepository", () => ({
	recordScreenView: jest.fn(() => Promise.resolve()),
	recordDashboardView: jest.fn(() => Promise.resolve()),
}));

const MANAGER = "100000000000000002";
const MEMBER = "100000000000000003";
const STRANGER = "100000000000000004";
const GUILD = "900000000000000001";
const ROUTE = "/guilds/:guildId/levelling";

function appFor(userId: string | null): Hono<ApiBindings> {
	const people = new Map([
		[MANAGER, { permissions: { has: (bit: bigint) => bit === PermissionFlagsBits.ManageGuild } }],
		[MEMBER, { permissions: { has: () => false } }],
	]);
	const client = {
		guilds: {
			cache: new Collection([
				[
					GUILD,
					{
						members: {
							fetch: (id: string) => {
								const member = people.get(id);
								return member === undefined ? Promise.reject(new Error("Unknown Member")) : Promise.resolve(member);
							},
						},
					},
				],
			]),
		},
		logger: { debug: jest.fn() },
	} as unknown as TestifyClient;

	const app = new Hono<ApiBindings>();
	app.use("*", async (context, next) => {
		context.set("client", client);
		if (userId !== null) context.set("session", { _id: "s", userId } as never);
		await next();
	});
	app.route("/screens", screens);
	app.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return app;
}

async function view(userId: string | null, body: Record<string, unknown>): Promise<number> {
	const response = await appFor(userId).request("/screens", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	return response.status;
}

beforeEach(() => {
	jest.clearAllMocks();
});

/** Anybody signed in can send a guild id, so it only counts when the sender could have opened that server's screens. */
it.each([
	["somebody in the server without Manage Server", MEMBER, GUILD],
	["somebody not in the server", STRANGER, GUILD],
	["a server the bot is not in", MANAGER, "900000000000000009"],
])("does not count the server for %s", async (_, userId, guildId) => {
	expect(await view(userId, { route: ROUTE, guildId })).toBe(204);

	expect(recordScreenView).toHaveBeenCalledWith(ROUTE);
	expect(recordDashboardView).not.toHaveBeenCalled();
});

it("refuses a server id that is not one", async () => {
	expect(await view(MANAGER, { route: ROUTE, guildId: "nope" })).toBe(400);
	expect(recordScreenView).not.toHaveBeenCalled();
});

it("refuses somebody signed out", async () => {
	expect(await view(null, { route: ROUTE, guildId: GUILD })).toBe(401);
});

it("answers 204 when the count cannot be written, because a navigation must never fail over it", async () => {
	jest.mocked(recordDashboardView).mockRejectedValueOnce(new Error("down"));

	expect(await view(MANAGER, { route: ROUTE, guildId: GUILD })).toBe(204);
});
