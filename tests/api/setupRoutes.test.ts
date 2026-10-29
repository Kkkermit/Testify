import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { setup } from "@api/routes/setup";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { readSetupChecklist, runSetupStep } from "@lib/settings";
import { type SetupChecklist } from "@testify/shared";

jest.mock("@lib/settings", () => ({ readSetupChecklist: jest.fn(), runSetupStep: jest.fn() }));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

const checklist: SetupChecklist = {
	steps: [{ step: "levelling", done: true, channelId: null, channelName: null, createsChannel: false, blocker: null }],
};

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
		context.set("session", { _id: "s", userId: OWNER, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/setup", setup);
	instance.onError((error) => {
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? new ApiProblem(400, "bad_request", error.message)
					: new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(readSetupChecklist).mockResolvedValue(checklist);
	jest.mocked(runSetupStep).mockResolvedValue({ checklist, channelId: "400000000000000001" });
});

describe("the setup checklist", () => {
	it("refuses a step it does not know", async () => {
		const response = await app().request(`/guilds/${GUILD}/setup/everything`, { method: "POST" });

		expect(response.status).toBe(400);
		expect(runSetupStep).not.toHaveBeenCalled();
	});

	it("records nothing when the step is refused", async () => {
		jest.mocked(runSetupStep).mockRejectedValueOnce(new UserFacingError("That is already set up."));

		const response = await app().request(`/guilds/${GUILD}/setup/welcome`, { method: "POST" });

		expect(response.status).toBe(400);
		expect(recordAudit).not.toHaveBeenCalled();
	});
});
