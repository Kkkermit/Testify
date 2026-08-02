import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { verification } from "@api/routes/verification";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { deleteVerifyConfig, getVerifyConfig, saveVerifyConfig } from "@database/repositories/verificationRepository";
import { publishVerifyPanel } from "@lib/verifyActions.util";
import { type VerificationConfigResponse } from "@testify/shared";

jest.mock("@database/repositories/verificationRepository", () => ({
	deleteVerifyConfig: jest.fn(() => Promise.resolve(true)),
	getVerifyConfig: jest.fn(() => Promise.resolve(null)),
	saveVerifyConfig: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/verifyActions.util", () => ({
	publishVerifyPanel: jest.fn(() => Promise.resolve("500000000000000001")),
	roleTooHigh: jest.fn(() => false),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";
const ROLE = "300000000000000001";

const stored = jest.mocked(getVerifyConfig);
const saved = jest.mocked(saveVerifyConfig);
const removed = jest.mocked(deleteVerifyConfig);
const published = jest.mocked(publishVerifyPanel);
const audited = jest.mocked(recordAudit);

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server", roles: { cache: new Collection() }, members: { me: null } };
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

	it("reports what is stored, and how many have passed", async () => {
		configured({ messageId: "999" });

		const body = (await (await send("GET")).json()) as VerificationConfigResponse;

		expect(body).toMatchObject({ enabled: true, channelId: CHANNEL, roleId: ROLE, posted: true, verifiedCount: 2 });
	});
});

describe("PATCH /verification", () => {
	it("refuses a change that would leave it half configured", async () => {
		const response = await send("PATCH", { channelId: CHANNEL });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	/**
	 * The panel is a message in a public channel, so it is posted only when asked for. Choosing a channel must
	 * not drop one into it before the wording has been looked at.
	 */
	it("does not post the panel just because a channel was chosen", async () => {
		configured();

		await send("PATCH", { channelId: "400000000000000002" });

		expect(published).not.toHaveBeenCalled();
		expect(saved).toHaveBeenCalled();
	});

	it("posts the panel when asked", async () => {
		configured();

		await send("PATCH", { publish: true });

		expect(published).toHaveBeenCalled();
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ messageId: "500000000000000001" }));
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

	it("removes the configuration when it is turned off", async () => {
		configured();

		await send("PATCH", { enabled: false });

		expect(removed).toHaveBeenCalledWith(GUILD);
		expect(saved).not.toHaveBeenCalled();
	});

	it("strips invisible characters from the wording before storing it", async () => {
		configured();

		await send("PATCH", { message: " Press \u202ehere " });

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ message: "Press here" }));
	});

	it("writes an audit record naming what changed", async () => {
		configured();

		await send("PATCH", { roleId: "300000000000000002" });

		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "verification.update" }));
	});
});
