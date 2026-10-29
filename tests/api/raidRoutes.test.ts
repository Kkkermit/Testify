import { Collection, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { raid } from "@api/routes/raid";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { getRaidSettings, saveRaidSettings } from "@database/repositories/raidRepository";

jest.mock("@database/repositories/raidRepository", () => ({
	getRaidSettings: jest.fn(() => Promise.resolve(null)),
	saveRaidSettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

function app(): Hono<ApiBindings> {
	const guild = {
		id: GUILD,
		name: "Test Server",
		roles: { cache: new Map() },
		members: { me: { permissions: new PermissionsBitField([PermissionFlagsBits.ModerateMembers]) } },
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
	instance.route("/guilds/:guildId/raid-protection", raid);
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
	return app().request(`/guilds/${GUILD}/raid-protection`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getRaidSettings).mockResolvedValue(null);
});

describe("the raid protection routes", () => {
	it("refuses to turn on with nothing to do, in words, with nothing written", async () => {
		const response = await send("PATCH", { enabled: true });

		expect(response.status).toBe(400);
		expect(JSON.stringify(await response.json())).toContain("minimum account age or an alert channel");
		expect(saveRaidSettings).not.toHaveBeenCalled();
		expect(recordAudit).not.toHaveBeenCalled();
	});

	/** Past 28 days a hold would lift before the account was old enough, because Discord caps a timeout there. */
	it("refuses a minimum age past Discord's longest timeout, and a spike below its floor", async () => {
		expect((await send("PATCH", { minAccountAgeDays: 29 })).status).toBe(400);
		expect((await send("PATCH", { spikeJoins: 2 })).status).toBe(400);
		expect((await send("PATCH", {})).status).toBe(400);
		expect(saveRaidSettings).not.toHaveBeenCalled();
	});

	it("saves a minimum age and writes it down", async () => {
		const response = await send("PATCH", { minAccountAgeDays: 7, enabled: true });

		expect(response.status).toBe(200);
		expect(saveRaidSettings).toHaveBeenCalledWith(
			GUILD,
			expect.objectContaining({ enabled: true, minAccountAgeDays: 7 }),
			OWNER,
		);
		expect(recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "raid.update",
				summary: "Turned raid protection on, Changed the minimum account age",
			}),
		);
	});
});
