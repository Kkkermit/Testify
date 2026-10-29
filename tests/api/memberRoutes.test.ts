import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { members } from "@api/routes/members";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import {
	countAccounts,
	countGlobalAccounts,
	getGlobalLeaderboard,
	getLeaderboard,
} from "@database/repositories/economyRepository";
import { countRanked, getLevelLeaderboard } from "@database/repositories/levelRepository";
import { type BoardPage } from "@testify/shared";

jest.mock("@database/repositories/economyRepository", () => ({
	getLeaderboard: jest.fn(() => Promise.resolve([])),
	countAccounts: jest.fn(() => Promise.resolve(0)),
	getEconomyRank: jest.fn(() => Promise.resolve(null)),
	getGlobalLeaderboard: jest.fn(() => Promise.resolve([])),
	countGlobalAccounts: jest.fn(() => Promise.resolve(0)),
	getGlobalRank: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/levelRepository", () => ({
	getLevelLeaderboard: jest.fn(() => Promise.resolve([])),
	countRanked: jest.fn(() => Promise.resolve(0)),
	getRank: jest.fn(() => Promise.resolve(null)),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

const economyRows = jest.mocked(getLeaderboard);
const economyTotal = jest.mocked(countAccounts);
const globalRows = jest.mocked(getGlobalLeaderboard);
const globalTotal = jest.mocked(countGlobalAccounts);
const levelRows = jest.mocked(getLevelLeaderboard);
const levelTotal = jest.mocked(countRanked);

function app(): Hono<ApiBindings> {
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: { cache: new Collection<string, unknown>(), fetch: jest.fn(() => Promise.resolve(new Collection())) },
		client: { users: { fetch: jest.fn(() => Promise.reject(new Error("Unknown User"))) } },
	};
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
		context.set("session", { _id: "s", userId: OWNER, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/members", members);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function board(query = ""): Promise<Response> {
	return app().request(`/guilds/${GUILD}/members/leaderboard${query}`);
}

beforeEach(() => {
	// `clearAllMocks` forgets the calls but keeps the implementations, so each default is restated here.
	jest.clearAllMocks();
	economyRows.mockResolvedValue([]);
	economyTotal.mockResolvedValue(0);
	globalRows.mockResolvedValue([]);
	globalTotal.mockResolvedValue(0);
	levelRows.mockResolvedValue([]);
	levelTotal.mockResolvedValue(0);
});

describe("GET /members/leaderboard", () => {
	/** An unvalidated page reaching the query would become a negative skip. */
	it("refuses a page below one", async () => {
		expect((await board("?page=0")).status).toBe(400);
	});

	it("refuses a board it does not have", async () => {
		expect((await board("?board=warnings")).status).toBe(400);
	});

	/** The bot-wide board adds up the servers the bot is in now, taken from the client rather than the request. */
	it("reads the bot-wide board over the client's own servers", async () => {
		globalRows.mockResolvedValue([{ userId: "1", wallet: 10, bank: 990, total: 1_000 }] as never);
		globalTotal.mockResolvedValue(1);

		const body = (await (await board("?scope=global&sort=bank")).json()) as BoardPage;

		expect(body).toMatchObject({ sort: "bank", scope: "global", total: 1 });
		expect(body.rows[0]).toMatchObject({ primary: 990, secondary: 10 });
		expect(globalRows).toHaveBeenCalledWith([GUILD], 25, "bank", 0);
		expect(economyRows).not.toHaveBeenCalled();
		// Somebody Discord no longer knows is still ranked, just not named.
		expect(body.rows[0]).toMatchObject({ displayName: "Unknown user", inGuild: false });
	});

	it("refuses a sort or a scope it does not have", async () => {
		expect((await board("?sort=pets")).status).toBe(400);
		expect((await board("?scope=galaxy")).status).toBe(400);
	});
});
