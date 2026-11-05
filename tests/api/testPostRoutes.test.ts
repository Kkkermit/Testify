import { Collection, DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { testPost, testPostLimiter } from "@api/routes/testPost";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

function app(inServer = true, delivered = true) {
	const closed = new DiscordAPIError(
		{ code: RESTJSONErrorCodes.CannotSendMessagesToThisUser, message: "Cannot send messages to this user" },
		RESTJSONErrorCodes.CannotSendMessagesToThisUser,
		403,
		"POST",
		"/channels/1/messages",
		{},
	);
	const send = jest.fn((_message: unknown): Promise<object> =>
		delivered ? Promise.resolve({}) : Promise.reject(closed),
	);
	const guild = { id: GUILD, name: "Test Server", memberCount: 10 };
	const member = { id: OWNER, user: { username: "owner" }, displayName: "Owner", guild, send };
	Object.assign(guild, {
		members: {
			fetch: jest.fn(() => (inServer ? Promise.resolve(member) : Promise.reject(new Error("Unknown Member")))),
		},
	});
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
		context.set("session", { _id: "s", userId: OWNER, username: "owner" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/test-post", testPost);
	instance.onError((error) => {
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? badRequest(error.message)
					: new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return { instance, send };
}

const post = (instance: Hono<ApiBindings>, body: unknown) =>
	instance.request(`/guilds/${GUILD}/test-post`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

beforeEach(() => {
	jest.clearAllMocks();
	testPostLimiter.sweep(Number.POSITIVE_INFINITY);
});

describe("the test-post route", () => {
	/** There is no recipient to choose: the test goes to whoever asked, and the message pings nobody. */
	it("sends a note and then the message to the person asking, and records it", async () => {
		const { instance, send } = app();

		const response = await post(instance, { kind: "plain", message: "@everyone movie night" });

		expect(response.status).toBe(204);
		expect(send).toHaveBeenCalledTimes(2);
		expect(send.mock.calls[1]?.[0]).toEqual({ content: "@everyone movie night", allowedMentions: { parse: [] } });
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "test.send" }));
	});

	/** The privacy notice promises a test is recorded by its kind and never by its words. */
	it("keeps the kind of post in the audit record and none of its text", async () => {
		const { instance } = app();

		await post(instance, { kind: "plain", message: "a secret only the draft holds" });

		expect(JSON.stringify(jest.mocked(recordAudit).mock.calls)).not.toContain("secret only the draft holds");
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ after: { kind: "plain" } }));
	});

	/** A direct message is cheap to send and easy to flood somebody with, so each person gets a few a minute. */
	it("refuses a fourth test inside a minute", async () => {
		const { instance } = app();
		const statuses = [];
		for (let attempt = 0; attempt < 4; attempt++) {
			statuses.push((await post(instance, { kind: "plain", message: "Hi" })).status);
		}

		expect(statuses).toEqual([204, 204, 204, 429]);
	});

	it("refuses somebody who is not in the server, since there is no member to fill the message in for", async () => {
		const { instance, send } = app(false);

		const response = await post(instance, { kind: "plain", message: "Hi" });

		expect(response.status).toBe(403);
		expect(send).not.toHaveBeenCalled();
	});

	/** Shut direct messages are the reader's setting, not a fault, so the page can tell them which one to change. */
	it("answers dm_closed and records nothing when Discord will not deliver", async () => {
		const { instance } = app(true, false);

		const response = await post(instance, { kind: "plain", message: "Hi" });

		expect(response.status).toBe(403);
		expect(((await response.json()) as { error: { code: string } }).error.code).toBe("dm_closed");
		expect(recordAudit).not.toHaveBeenCalled();
	});

	it("refuses a kind it does not know", async () => {
		const { instance } = app();

		expect((await post(instance, { kind: "ticket", message: "Hi" })).status).toBe(400);
	});
});
