import { Collection, type Guild } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { giveaways } from "@api/routes/giveaways";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { deleteGiveaway, endGiveaway, listGiveaways, rerollGiveaway, startGiveaway } from "@lib/giveaways";

const GUILD = "900000000000000001";
const ACTOR = "100000000000000002";
const OURS = "500000000000000001";
const THEIRS = "500000000000000099";
const CHANNEL = "400000000000000001";

jest.mock("@lib/giveaways", () => ({
	listGiveaways: jest.fn(() => Promise.resolve([{ messageId: "500000000000000001" }])),
	startGiveaway: jest.fn(() => Promise.resolve()),
	endGiveaway: jest.fn(() => Promise.resolve()),
	rerollGiveaway: jest.fn(() => Promise.resolve()),
	deleteGiveaway: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const host = { id: ACTOR, username: "someone" };

function app(): Hono<ApiBindings> {
	const actor = { id: ACTOR, permissions: { has: () => true } };
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: { fetch: jest.fn(() => Promise.resolve(actor)) },
		channels: { cache: new Collection<string, unknown>([[CHANNEL, { id: CHANNEL }]]) },
	} as unknown as Guild;
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		users: { fetch: jest.fn(() => Promise.resolve(host)) },
		isOwner: () => false,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: ACTOR, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/giveaways", giveaways);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return instance;
}

const send = (method: string, path: string, body?: unknown): Promise<Response> =>
	Promise.resolve(
		app().request(`/guilds/${GUILD}/giveaways${path}`, {
			method,
			headers: { "content-type": "application/json" },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		}),
	);

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the giveaway routes", () => {
	it("lists only this server's giveaways", async () => {
		const response = await send("GET", "");

		expect(response.status).toBe(200);
		expect(listGiveaways).toHaveBeenCalledWith(expect.anything(), GUILD);
	});

	it("ends, rerolls and deletes a giveaway in this server, and writes each down", async () => {
		expect((await send("POST", `/${OURS}/end`)).status).toBe(200);
		expect((await send("POST", `/${OURS}/reroll`)).status).toBe(200);
		expect((await send("DELETE", `/${OURS}`)).status).toBe(200);

		expect(endGiveaway).toHaveBeenCalledWith(expect.anything(), OURS);
		expect(rerollGiveaway).toHaveBeenCalledWith(expect.anything(), OURS);
		expect(deleteGiveaway).toHaveBeenCalledWith(expect.anything(), OURS);
		expect(jest.mocked(recordAudit).mock.calls.map(([entry]) => entry.action)).toEqual([
			"giveaway.end",
			"giveaway.reroll",
			"giveaway.delete",
		]);
	});

	/** The giveaway library finds a message in any server, so a manager here must not reach one elsewhere by its id. */
	it.each([
		["POST", `/${THEIRS}/end`, endGiveaway],
		["POST", `/${THEIRS}/reroll`, rerollGiveaway],
		["DELETE", `/${THEIRS}`, deleteGiveaway],
	])("refuses %s %s for a giveaway in another server", async (method, path, action) => {
		const response = await send(method, path);

		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({ error: { code: "giveaway_not_found" } });
		expect(action).not.toHaveBeenCalled();
		expect(recordAudit).not.toHaveBeenCalled();
	});

	it("refuses an id that is not a message id before looking anything up", async () => {
		expect((await send("POST", "/not-an-id/end")).status).toBe(400);
		expect(listGiveaways).not.toHaveBeenCalled();
	});

	it("starts a giveaway hosted by whoever is signed in", async () => {
		const draft = { channelId: CHANNEL, prize: "A copy of the game", winnerCount: 1, durationMs: 3_600_000 };

		expect((await send("POST", "", draft)).status).toBe(200);
		expect(startGiveaway).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: GUILD }),
			expect.objectContaining({ ...draft, hostedBy: host }),
		);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "giveaway.start" }));
	});

	it("refuses to start one in a channel that is not in this server", async () => {
		const draft = { channelId: "400000000000000077", prize: "Nitro", winnerCount: 1, durationMs: 3_600_000 };

		expect((await send("POST", "", draft)).status).toBe(400);
		expect(startGiveaway).not.toHaveBeenCalled();
	});
});
