import { Collection, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { announcements } from "@api/routes/announcements";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";
const ME = { id: "100000000000000009" };

function app(botMentions = true) {
	const send = jest.fn((_message: unknown) => Promise.resolve({ url: "https://discord.com/channels/9/4/5" }));
	const channel = {
		id: CHANNEL,
		name: "news",
		isTextBased: () => true,
		isSendable: () => true,
		send,
		permissionsFor: () => new PermissionsBitField(botMentions ? [PermissionFlagsBits.MentionEveryone] : []),
	};
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: { me: ME },
		channels: { cache: new Collection([[CHANNEL, channel]]) },
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
		context.set("session", { _id: "s", userId: OWNER, username: "owner" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/announcements", announcements);
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
	instance.request(`/guilds/${GUILD}/announcements`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the announcement route", () => {
	/** A form that forgot to say leaves the mentions at none, so a stray @everyone in the text pings nobody. */
	it("posts as the bot and pings nobody unless asked", async () => {
		const { instance, send } = app();

		const response = await post(instance, { channelId: CHANNEL, style: "text", message: "@everyone hello" });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ channelId: CHANNEL, url: "https://discord.com/channels/9/4/5" });
		expect(send).toHaveBeenCalledWith({ content: "@everyone hello", allowedMentions: { parse: [] } });
		expect(recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "announcement.post", summary: "Posted an announcement in #news" }),
		);
	});

	it("refuses to ping everybody when the bot cannot, and sends nothing", async () => {
		const { instance, send } = app(false);

		const response = await post(instance, { channelId: CHANNEL, style: "text", message: "Hi", mentions: "everyone" });

		expect(response.status).toBe(403);
		expect(send).not.toHaveBeenCalled();
		expect(recordAudit).not.toHaveBeenCalled();
	});

	it("refuses an empty message, a colour off the list and a channel it cannot post in", async () => {
		const { instance, send } = app();

		expect((await post(instance, { channelId: CHANNEL, style: "text", message: "" })).status).toBe(400);
		expect((await post(instance, { channelId: CHANNEL, style: "embed", message: "x", colour: "#123456" })).status).toBe(
			400,
		);
		expect((await post(instance, { channelId: "400000000000000777", style: "text", message: "x" })).status).toBe(400);
		expect(send).not.toHaveBeenCalled();
	});
});
