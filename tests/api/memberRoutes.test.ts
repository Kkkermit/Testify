import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { members } from "@api/routes/members";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { countAccounts, getLeaderboard } from "@database/repositories/economyRepository";
import { countRanked, getLevelLeaderboard } from "@database/repositories/levelRepository";
import { type BoardPage } from "@testify/shared";

jest.mock("@database/repositories/economyRepository", () => ({
	getLeaderboard: jest.fn(() => Promise.resolve([])),
	countAccounts: jest.fn(() => Promise.resolve(0)),
	getEconomyRank: jest.fn(() => Promise.resolve(null)),
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
const levelRows = jest.mocked(getLevelLeaderboard);
const levelTotal = jest.mocked(countRanked);

function app(): Hono<ApiBindings> {
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: { cache: new Collection<string, unknown>(), fetch: jest.fn(() => Promise.resolve(new Collection())) },
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
	levelRows.mockResolvedValue([]);
	levelTotal.mockResolvedValue(0);
});

describe("GET /members/leaderboard", () => {
	it("defaults to the economy board and its first page", async () => {
		const body = (await (await board()).json()) as BoardPage;

		expect(body).toMatchObject({ board: "economy", page: 1, pages: 1, total: 0, rows: [] });
	});

	it("reads the levels board when asked for it", async () => {
		levelRows.mockResolvedValue([{ userId: "1", level: 12, xp: 4_800 }] as never);
		levelTotal.mockResolvedValue(1);

		const body = (await (await board("?board=levels")).json()) as BoardPage;

		expect(body.board).toBe("levels");
		expect(body.rows[0]).toMatchObject({ rank: 1, primary: 12, secondary: 4_800 });
	});

	it("ranks a later page from where that page starts", async () => {
		economyRows.mockResolvedValue([{ userId: "1", total: 900, bank: 0 }] as never);
		economyTotal.mockResolvedValue(60);

		const body = (await (await board("?page=3")).json()) as BoardPage;

		expect(body).toMatchObject({ page: 3, pages: 3 });
		expect(body.rows[0]?.rank).toBe(51);
	});

	/** An unvalidated page reaching the query would become a negative skip. */
	it("refuses a page below one", async () => {
		expect((await board("?page=0")).status).toBe(400);
	});

	it("refuses a board it does not have", async () => {
		expect((await board("?board=warnings")).status).toBe(400);
	});
});
