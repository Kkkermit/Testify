import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { birthdays } from "@api/routes/birthdays";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { saveBirthdaySettings } from "@database/repositories/birthdayRepository";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";

jest.mock("@database/repositories/birthdayRepository", () => ({
	countBirthdays: jest.fn(() => Promise.resolve(2)),
	getBirthdaySettings: jest.fn(() => Promise.resolve(null)),
	listBirthdays: jest.fn(() =>
		Promise.resolve([{ guildId: "900000000000000001", userId: "1", username: "sam", day: 25, month: 10 }]),
	),
	saveBirthdaySettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server", memberCount: 3, members: { cache: new Map() } };
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
	instance.route("/guilds/:guildId/birthdays", birthdays);
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

async function send(method: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/birthdays`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the birthday routes", () => {
	it("refuses to turn on with nowhere to post, in words, with nothing written", async () => {
		const response = await send("PATCH", { enabled: true });

		expect(response.status).toBe(400);
		expect(JSON.stringify(await response.json())).toContain("Pick a channel for birthdays");
		expect(saveBirthdaySettings).not.toHaveBeenCalled();
		expect(recordAudit).not.toHaveBeenCalled();
	});

	it("saves a channel and a message, and writes it down", async () => {
		const response = await send("PATCH", { channelId: "400000000000000001", message: "Happy day, {user}!" });

		expect(response.status).toBe(200);
		expect(saveBirthdaySettings).toHaveBeenCalledWith(
			GUILD,
			{ enabled: false, channelId: "400000000000000001", message: "Happy day, {user}!" },
			OWNER,
		);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "birthdays.update" }));
	});

	it("refuses an empty patch and a message too long", async () => {
		expect((await send("PATCH", {})).status).toBe(400);
		expect((await send("PATCH", { message: "x".repeat(501) })).status).toBe(400);
	});
});
