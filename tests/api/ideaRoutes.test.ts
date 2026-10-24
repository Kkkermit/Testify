import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { ideas } from "@api/routes/ideas";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { listIdeas } from "@database/repositories/ideaRepository";
import { decideOnIdea, removeIdea } from "@lib/ideas/ideaActions.util";

jest.mock("@database/repositories/ideaRepository", () => ({
	listIdeas: jest.fn(() => Promise.resolve({ items: [], total: 0 })),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/ideas/ideaActions.util", () => ({
	...jest.requireActual<object>("@lib/ideas/ideaActions.util"),
	applyIdeaSettings: jest.fn(() => Promise.resolve({})),
	decideOnIdea: jest.fn(),
	readIdeaSettings: jest.fn(() => Promise.resolve({})),
	removeIdea: jest.fn(() => Promise.resolve(null)),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const ID = "6650a1b2c3d4e5f6a7b8c9d0";

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server" };
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: (id: string) => id === OWNER,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: OWNER, username: "kate" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/ideas", ideas);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/ideas${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the idea board routes", () => {
	it("pages the list by the filter asked for", async () => {
		expect((await send("GET", "/list?status=declined&page=3")).status).toBe(200);
		expect(listIdeas).toHaveBeenCalledWith(GUILD, "declined", { skip: 20, limit: 10 });
	});

	it("refuses a filter that is not one", async () => {
		expect((await send("GET", "/list?status=$where")).status).toBe(400);
		expect(listIdeas).not.toHaveBeenCalled();
	});

	it("refuses a settings change that changes nothing", async () => {
		expect((await send("PATCH", "", {})).status).toBe(400);
	});

	/** The decision is signed with the session's own name, never one the request supplies. */
	it("decides as the person signed in", async () => {
		jest.mocked(decideOnIdea).mockResolvedValue({
			id: ID,
			number: 4,
			status: "accepted",
			upVoters: [],
			downVoters: [],
			decidedAt: new Date(),
			createdAt: new Date(),
			messageId: null,
		} as never);

		const response = await send("POST", `/${ID}/decision`, { status: "accepted", reason: "Yes", by: "someone else" });

		expect(response.status).toBe(200);
		expect(decideOnIdea).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: GUILD }),
			ID,
			{ status: "accepted", reason: "Yes" },
			{ id: OWNER, name: "kate" },
		);
	});

	it("refuses a reason with HTML in it", async () => {
		expect((await send("POST", `/${ID}/decision`, { status: "declined", reason: "<b>no</b>" })).status).toBe(400);
		expect(decideOnIdea).not.toHaveBeenCalled();
	});

	it("answers 404 for an idea this server does not have", async () => {
		expect((await send("DELETE", `/${ID}`)).status).toBe(404);
		expect(removeIdea).toHaveBeenCalledWith(expect.objectContaining({ id: GUILD }), ID);
	});
});
