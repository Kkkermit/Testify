import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { botStats } from "@api/routes/botStats";
import { memberCount } from "@api/routes/memberCount";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import type * as Info from "@lib/info";
import { postBotStats, readMemberCounts, removeBotStats } from "@lib/info";

jest.mock("@lib/info", () => ({
	...jest.requireActual<typeof Info>("@lib/info"),
	postBotStats: jest.fn(),
	readBotStats: jest.fn(() => Promise.resolve({ channelId: null })),
	removeBotStats: jest.fn(() => Promise.resolve(true)),
	readMemberCounts: jest.fn(),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OTHER_GUILD = "900000000000000002";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";

const posted = jest.mocked(postBotStats);
const removed = jest.mocked(removeBotStats);
const counted = jest.mocked(readMemberCounts);
const audited = jest.mocked(recordAudit);

function app(): Hono<ApiBindings> {
	const guild = (id: string) => ({ id, name: "Test Server", members: { me: {} } });
	const client = {
		user: { id: "200000000000000002" },
		guilds: {
			cache: new Map<string, unknown>([
				[GUILD, guild(GUILD)],
				[OTHER_GUILD, guild(OTHER_GUILD)],
			]),
		},
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
	instance.route("/guilds/:guildId/bot-stats", botStats);
	instance.route("/guilds/:guildId/member-count", memberCount);
	instance.onError((error) => {
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? badRequest(error.message)
					: new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
	return app().request(path, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	removed.mockResolvedValue(true);
});

describe("the bot statistics routes", () => {
	it("posts in the chosen channel and writes it down", async () => {
		posted.mockResolvedValue({ channelId: CHANNEL });

		const response = await send("PUT", `/guilds/${GUILD}/bot-stats`, { channelId: CHANNEL });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ channelId: CHANNEL });
		expect(posted).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: GUILD }), CHANNEL, OWNER);
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "bot-stats.post" }));
	});

	it("refuses a channel id that is not one", async () => {
		const response = await send("PUT", `/guilds/${GUILD}/bot-stats`, { channelId: "general" });

		expect(response.status).toBe(400);
		expect(posted).not.toHaveBeenCalled();
	});

	/** The refusal is the sentence the form shows beside the picker, so it has to arrive intact. */
	it("passes the bot's own refusal through as a 400", async () => {
		posted.mockRejectedValue(new UserFacingError("Pick a text channel I can send messages in."));

		const response = await send("PUT", `/guilds/${GUILD}/bot-stats`, { channelId: CHANNEL });

		expect(response.status).toBe(400);
		expect(JSON.stringify(await response.json())).toContain("Pick a text channel");
		expect(audited).not.toHaveBeenCalled();
	});

	it("answers 404 for removing a message that is not there", async () => {
		removed.mockResolvedValue(false);

		expect((await send("DELETE", `/guilds/${GUILD}/bot-stats`)).status).toBe(404);
		expect(audited).not.toHaveBeenCalled();
	});

	it("removes the message and says there is none now", async () => {
		const response = await send("DELETE", `/guilds/${GUILD}/bot-stats`);

		expect(await response.json()).toEqual({ channelId: null });
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "bot-stats.remove" }));
	});
});

describe("the member count route", () => {
	const counts = { total: 10, people: 8, bots: 2, joinedDay: 1, joinedWeek: 3 };

	it("answers with the breakdown", async () => {
		counted.mockResolvedValue(counts);

		expect(await (await send("GET", `/guilds/${GUILD}/member-count`)).json()).toEqual(counts);
	});

	/** Each count fetches the whole member list over the gateway, so a reload must not ask again. */
	it("reuses a recent count rather than fetching every member again", async () => {
		counted.mockResolvedValue(counts);

		await send("GET", `/guilds/${OTHER_GUILD}/member-count`);
		await send("GET", `/guilds/${OTHER_GUILD}/member-count`);

		expect(counted).toHaveBeenCalledTimes(1);
	});
});
