import { Collection, PermissionsBitField } from "discord.js";
import { Hono } from "hono";
import { answerLikeTheApp, withSession } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { guildModmail } from "@api/routes/guildModmail";
import { type TestifyClient } from "@core/client";
import { listOpenConversations } from "@database/repositories/modmailRepository";
import { closeModmail } from "@lib/modmail/modmailActions.util";

jest.mock("@database/repositories/modmailRepository", () => ({
	listOpenConversations: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/modmail/modmailActions.util", () => ({
	...jest.requireActual<object>("@lib/modmail/modmailActions.util"),
	closeModmail: jest.fn(),
	readModmailSettings: jest.fn(() =>
		Promise.resolve({ enabled: true, channelId: CHANNEL, canUse: true, pingRoleId: null, anonymous: false, open: 1 }),
	),
}));

const GUILD = "900000000000000001";
const CHANNEL = "400000000000000001";
const MANAGER = "100000000000000001";

/** A manager holding Manage Server, who may or may not be able to see the mod mail channel. */
function app(seesChannel: boolean, extra: bigint[] = []): Hono<ApiBindings> {
	const permissions = new PermissionsBitField([PermissionsBitField.Flags.ManageGuild, ...extra]);
	const member = { id: MANAGER, permissions, roles: { highest: { position: 1 } } };
	const channel = {
		id: CHANNEL,
		permissionsFor: () => new PermissionsBitField(seesChannel ? [PermissionsBitField.Flags.ViewChannel] : []),
	};
	const guild = {
		id: GUILD,
		name: "Test Server",
		ownerId: "1",
		members: { fetch: jest.fn(() => Promise.resolve(member)) },
		channels: { cache: new Collection([[CHANNEL, channel]]) },
	};
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: () => false,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	withSession(instance, client, { userId: MANAGER, username: "kate" });
	instance.route("/guilds/:guildId/modmail", guildModmail);
	answerLikeTheApp(instance);
	return instance;
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the mod mail routes", () => {
	/** Discord hides a channel's threads from whoever cannot view it, so the list of who wrote in must stay hidden too. */
	it("lists conversations only to a manager who can see the mod mail channel", async () => {
		const hidden = await app(false).request(`/guilds/${GUILD}/modmail/conversations`);
		expect(await hidden.json()).toEqual({ visible: false, items: [] });
		expect(listOpenConversations).not.toHaveBeenCalled();

		const shown = await app(true).request(`/guilds/${GUILD}/modmail/conversations`);
		expect(await shown.json()).toEqual({ visible: true, items: [] });
	});

	it("closes a conversation as the person signed in, only with Manage Messages and the channel in sight", async () => {
		jest.mocked(closeModmail).mockResolvedValue({
			id: "c".repeat(24),
			guildId: GUILD,
			userId: "100000000000000009",
			username: "member",
			threadId: null,
			status: "closed",
			waiting: false,
			lastMessageAt: new Date(),
			closedAt: new Date(),
			closedBy: MANAGER,
			createdAt: new Date(),
		});
		const path = `/guilds/${GUILD}/modmail/conversations/${"c".repeat(24)}/close`;

		expect((await app(true).request(path, { method: "POST" })).status).toBe(403);
		const unseen = app(false, [PermissionsBitField.Flags.ManageMessages]);
		expect((await unseen.request(path, { method: "POST" })).status).toBe(403);
		expect(closeModmail).not.toHaveBeenCalled();

		const closed = await app(true, [PermissionsBitField.Flags.ManageMessages]).request(path, { method: "POST" });
		expect(closed.status).toBe(200);
		expect(closeModmail).toHaveBeenCalledWith(
			expect.anything(),
			GUILD,
			"c".repeat(24),
			{ id: MANAGER, name: "kate" },
			"staff",
		);
	});
});
