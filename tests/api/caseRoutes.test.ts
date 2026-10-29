import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { cases } from "@api/routes/cases";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { listCases, saveCaseSettings } from "@database/repositories/caseRepository";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { canPostIn } from "@lib/discord/channels.util";

jest.mock("@database/repositories/caseRepository", () => ({
	findCase: jest.fn(() => Promise.resolve(null)),
	getCaseSettings: jest.fn(() => Promise.resolve(null)),
	listCases: jest.fn(() => Promise.resolve([])),
	saveCaseSettings: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/moderationRepository", () => ({
	listGuildWarnings: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server", memberCount: 3 };
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
	instance.route("/guilds/:guildId/cases", cases);
	instance.onError((error) => {
		// The same mapping the real app's boundary makes in `server.ts`.
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

async function send(method: string, path = "", body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/cases${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

const stored = (number: number, action: "warn" | "ban") => ({
	guildId: GUILD,
	number,
	action,
	userId: "100000000000000002",
	username: "kit",
	moderatorId: OWNER,
	moderatorName: "someone",
	reason: action === "ban" ? "raiding" : "spam",
	durationMs: null,
	createdAt: new Date(Date.UTC(2026, 9, number)),
});

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(canPostIn).mockReturnValue(true);
	jest.mocked(listCases).mockResolvedValue([stored(2, "ban"), stored(1, "warn")]);
});

describe("the case routes", () => {
	it("refuses a filter that is not an action", async () => {
		expect((await send("GET", "?action=nuke")).status).toBe(400);
	});

	it("sets the log channel and writes it down, and refuses one the bot cannot post in", async () => {
		const saved = await send("PUT", "/settings", { logChannelId: "400000000000000001" });
		expect(saved.status).toBe(200);
		expect(saveCaseSettings).toHaveBeenCalledWith(GUILD, "400000000000000001", OWNER);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "cases.settings" }));

		jest.mocked(canPostIn).mockReturnValue(false);
		expect((await send("PUT", "/settings", { logChannelId: "400000000000000002" })).status).toBe(400);
	});
});
