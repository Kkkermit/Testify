import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { verification } from "@api/routes/verification";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { getVerifyConfig, saveVerifyConfig } from "@database/repositories/verificationRepository";
import { publishVerifyPanel } from "@lib/settings/verifyActions.util";
import { type VerificationConfigResponse } from "@testify/shared";
import { BOT_ABOVE_ROLES, grantableRoles } from "@tests/helpers/mocks";

jest.mock("@database/repositories/verificationRepository", () => ({
	deleteVerifyConfig: jest.fn(() => Promise.resolve(true)),
	getVerifyConfig: jest.fn(() => Promise.resolve(null)),
	saveVerifyConfig: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/settings/verifyActions.util", () => ({
	publishVerifyPanel: jest.fn(() => Promise.resolve("500000000000000001")),
	roleTooHigh: jest.fn(() => false),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";
const ROLE = "300000000000000001";

const stored = jest.mocked(getVerifyConfig);
const saved = jest.mocked(saveVerifyConfig);
const published = jest.mocked(publishVerifyPanel);

function app(): Hono<ApiBindings> {
	const guild = {
		id: GUILD,
		name: "Test Server",
		roles: { cache: grantableRoles() },
		members: { me: BOT_ABOVE_ROLES },
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
	instance.route("/guilds/:guildId/verification", verification);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/verification`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

function configured(overrides: Record<string, unknown> = {}): void {
	stored.mockResolvedValue({
		guildId: GUILD,
		channelId: CHANNEL,
		roleId: ROLE,
		messageId: null,
		message: "Press to verify",
		verifiedIds: ["1", "2"],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
});

describe("GET /verification", () => {
	/** No record at all is how the bot stores "off", and a 404 would make the form unbuildable. */
	it("answers with the defaults a form can render when nothing is configured", async () => {
		const body = (await (await send("GET")).json()) as VerificationConfigResponse;

		expect(body.enabled).toBe(false);
		expect(body.channelId).toBeNull();
		expect(body.roleId).toBeNull();
		expect(body.message.length).toBeGreaterThan(0);
	});
});

describe("PATCH /verification", () => {
	it("refuses a change that would leave it half configured", async () => {
		const response = await send("PATCH", { channelId: CHANNEL });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	/** Choosing a channel does not post the panel; publishing does. */
	it("does not post the panel just because a channel was chosen", async () => {
		configured();

		await send("PATCH", { channelId: "400000000000000002" });

		expect(published).not.toHaveBeenCalled();
		expect(saved).toHaveBeenCalled();
	});

	/** A panel posted in the old channel is not the panel in the new one, so its id cannot carry over. */
	it("forgets the posted message when the channel changes", async () => {
		configured({ messageId: "999" });

		await send("PATCH", { channelId: "400000000000000002" });

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ messageId: null }));
	});

	/** The message out there says the old thing, so editing the wording has to update it. */
	it("updates a panel already posted when the wording changes", async () => {
		configured({ messageId: "999" });

		await send("PATCH", { message: "New wording" });

		expect(published).toHaveBeenCalled();
	});
});
