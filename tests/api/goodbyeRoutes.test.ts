import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { goodbye } from "@api/routes/goodbye";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { getGoodbyeSettings, saveGoodbyeSettings } from "@database/repositories/goodbyeRepository";
import { DEFAULT_GOODBYE_MESSAGE } from "@testify/shared";

jest.mock("@database/repositories/goodbyeRepository", () => ({
	getGoodbyeSettings: jest.fn(() => Promise.resolve(null)),
	saveGoodbyeSettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";

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
	instance.route("/guilds/:guildId/goodbye", goodbye);
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
	return app().request(`/guilds/${GUILD}/goodbye`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the goodbye route", () => {
	it("answers an unconfigured server with the defaults", async () => {
		const response = await send("GET");

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ enabled: false, message: DEFAULT_GOODBYE_MESSAGE, style: "text" });
	});

	it("saves a change through the same rules as the panel, and records it", async () => {
		const response = await send("PATCH", { channelId: CHANNEL, enabled: true });

		expect(response.status).toBe(200);
		expect(saveGoodbyeSettings).toHaveBeenCalledWith(
			GUILD,
			expect.objectContaining({ enabled: true, channelId: CHANNEL }),
			OWNER,
		);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "goodbye.update" }));
	});

	it("refuses to switch on with no channel, in words", async () => {
		const response = await send("PATCH", { enabled: true });

		expect(response.status).toBe(400);
		expect(JSON.stringify(await response.json())).toContain("Pick a channel for the goodbye");
		expect(saveGoodbyeSettings).not.toHaveBeenCalled();
	});

	/** The text is shown in a channel, so what makes it read differently from what was typed is refused at the door. */
	it("refuses markup and an empty message", async () => {
		expect((await send("PATCH", { message: "<script>x</script>" })).status).toBe(400);
		expect((await send("PATCH", { message: "​" })).status).toBe(400);
		expect((await send("PATCH", {})).status).toBe(400);
	});

	it("keeps a stored channel when only the wording changes", async () => {
		jest.mocked(getGoodbyeSettings).mockResolvedValue({
			enabled: true,
			channelId: CHANNEL,
			message: "Bye",
			style: "embed",
		});

		await send("PATCH", { message: "See you, {username}" });

		expect(saveGoodbyeSettings).toHaveBeenCalledWith(
			GUILD,
			{ enabled: true, channelId: CHANNEL, message: "See you, {username}", style: "embed" },
			OWNER,
		);
	});
});
