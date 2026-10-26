import { ChannelType, Collection, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { channelTools } from "@api/routes/channelTools";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { type ToolChannel } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";
const ME = { id: "100000000000000009" };

function app(botFlags: bigint[] = [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels]) {
	const edit = jest.fn(() => Promise.resolve());
	const setRateLimitPerUser = jest.fn(function (this: { rateLimitPerUser: number }, seconds: number) {
		this.rateLimitPerUser = seconds;
		return Promise.resolve();
	});
	const channel = {
		id: CHANNEL,
		name: "general",
		type: ChannelType.GuildText,
		rawPosition: 0,
		parent: null,
		rateLimitPerUser: 0,
		permissionOverwrites: { cache: new Collection(), edit },
		setRateLimitPerUser,
		permissionsFor: (who: { id: string }) =>
			new PermissionsBitField(who.id === ME.id ? botFlags : [PermissionFlagsBits.ManageChannels]),
	};
	const guild = {
		id: GUILD,
		name: "Test Server",
		roles: { everyone: { id: GUILD } },
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
	instance.route("/guilds/:guildId/channel-tools", channelTools);
	instance.onError((error) => {
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? badRequest(error.message)
					: new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return { instance, edit, setRateLimitPerUser };
}

const patch = (instance: Hono<ApiBindings>, body: unknown, channelId = CHANNEL) =>
	instance.request(`/guilds/${GUILD}/channel-tools/${channelId}`, {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the channel tool routes", () => {
	it("lists the text channels with what can be changed in each", async () => {
		const body = (await (await app().instance.request(`/guilds/${GUILD}/channel-tools`)).json()) as {
			channels: ToolChannel[];
		};

		expect(body.channels).toEqual([expect.objectContaining({ id: CHANNEL, locked: false, canLock: true })]);
	});

	/** The overwrite is not in the cache until Discord says so, so the answer has to come from what was asked. */
	it("locks a channel, answers with it locked, and writes it down under the manager's name", async () => {
		const { instance, edit } = app();

		const response = await patch(instance, { locked: true, reason: "Raid" });

		expect(response.status).toBe(200);
		expect(((await response.json()) as ToolChannel).locked).toBe(true);
		expect(edit).toHaveBeenCalledWith({ id: GUILD }, { SendMessages: false }, { reason: "owner: Raid" });
		expect(recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "channel.tools", summary: "Locked #general" }),
		);
	});

	it("sets a slowmode up to Discord's six hours and no further", async () => {
		const { instance, setRateLimitPerUser } = app();

		expect((await patch(instance, { slowmodeSeconds: 30 })).status).toBe(200);
		expect(setRateLimitPerUser).toHaveBeenCalledWith(30, "owner: No reason provided");
		expect((await patch(instance, { slowmodeSeconds: 21_601 })).status).toBe(400);
		expect((await patch(instance, {})).status).toBe(400);
	});

	it("refuses to lock where the bot cannot, before anything changes", async () => {
		const { instance, edit } = app([PermissionFlagsBits.ManageChannels]);

		expect((await patch(instance, { locked: true })).status).toBe(403);
		expect(edit).not.toHaveBeenCalled();
		expect(recordAudit).not.toHaveBeenCalled();
	});

	it("refuses a channel that is not in this server", async () => {
		expect((await patch(app().instance, { locked: true }, "400000000000000777")).status).toBe(400);
	});
});
