import { DiscordAPIError, type Guild, PermissionFlagsBits, RESTJSONErrorCodes } from "discord.js";
import { UserFacingError } from "@core/errors";
import { setRoleMenuMessage, type StoredRoleMenu, updateRoleMenu } from "@database/repositories/roleMenuRepository";
import { applyRolePicks, changeRoleMenu, publishRoleMenu } from "@lib/roles/roleMenuActions.util";
import { fakeGuild, fakeMember } from "@tests/helpers/roles";

jest.mock("@database/repositories/roleMenuRepository", () => ({
	listRoleMenus: jest.fn(() => Promise.resolve([])),
	setRoleMenuMessage: jest.fn(() => Promise.resolve()),
	updateRoleMenu: jest.fn(),
}));

const updated = jest.mocked(updateRoleMenu);
const remembered = jest.mocked(setRoleMenuMessage);

const MENU: StoredRoleMenu = {
	id: "6650a1b2c3d4e5f6a7b8c9d0",
	guildId: "900000000000000001",
	channelId: "400000000000000001",
	messageId: null,
	title: "Pings",
	description: "",
	roleIds: ["red", "blue", "mods"],
	mode: "many",
	updatedBy: null,
};

function server(): Guild {
	return fakeGuild([
		{ id: "red", position: 5 },
		{ id: "blue", position: 6 },
		{ id: "mods", position: 7, permissions: [PermissionFlagsBits.BanMembers] },
	]);
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("handing a member what they picked", () => {
	/** A role that became powerful after the menu was made is neither given nor quietly taken away. */
	it("leaves a role that is not on offer exactly as it is", async () => {
		const guild = server();
		const holder = fakeMember(guild, "1", ["mods"]);
		const asker = fakeMember(guild, "2");

		expect(await applyRolePicks(guild, MENU, holder.member, [])).toEqual({ added: [], removed: [], refused: [] });
		expect(await applyRolePicks(guild, MENU, asker.member, ["mods"])).toEqual({
			added: [],
			removed: [],
			refused: ["mods"],
		});
		expect(holder.remove).not.toHaveBeenCalled();
		expect(asker.add).not.toHaveBeenCalled();
	});

	/** Custom IDs and values come back from Discord, but only the menu's own roles are ever touched. */
	it("ignores a value that is not on the menu", async () => {
		const guild = fakeGuild([
			{ id: "red", position: 5 },
			{ id: "elsewhere", position: 5 },
		]);
		const { member, add } = fakeMember(guild, "1");

		await applyRolePicks(guild, MENU, member, ["elsewhere", "red"]);

		expect(add).toHaveBeenCalledWith(["red"], expect.any(String));
	});

	it("keeps one role when only one may be held", async () => {
		const guild = server();
		const { member, add, remove } = fakeMember(guild, "1", ["red", "blue"]);

		await applyRolePicks(guild, { ...MENU, mode: "one" }, member, ["blue", "red"]);

		expect(add).not.toHaveBeenCalled();
		expect(remove).toHaveBeenCalledWith(["red"], expect.any(String));
	});

	it("explains a refusal from Discord as the permission it needs", async () => {
		const guild = server();
		const { member, add } = fakeMember(guild, "1");
		add.mockRejectedValue(
			new DiscordAPIError(
				{ code: RESTJSONErrorCodes.MissingPermissions, message: "Missing Permissions" },
				RESTJSONErrorCodes.MissingPermissions,
				403,
				"PUT",
				"/",
				{},
			),
		);

		await expect(applyRolePicks(guild, MENU, member, ["red"])).rejects.toThrow(/Manage Roles permission/);
	});
});

describe("posting a menu", () => {
	function channel(existing: { edit: jest.Mock } | null = null) {
		return {
			isSendable: () => true,
			isTextBased: () => true,
			send: jest.fn(() => Promise.resolve({ id: "500000000000000009" })),
			messages: {
				fetch: jest.fn(() => (existing === null ? Promise.reject(new Error("gone")) : Promise.resolve(existing))),
				delete: jest.fn(() => Promise.resolve()),
			},
		};
	}

	function withChannels(guild: Guild, channels: Record<string, unknown>): Guild {
		return {
			...guild,
			channels: { fetch: jest.fn((id: string) => Promise.resolve(channels[id] ?? null)) },
		} as unknown as Guild;
	}

	/** The role list is mentions, so a post that pinged them would ping every holder of every role. */
	it("posts without pinging anybody and remembers the message", async () => {
		const target = channel();
		const guild = withChannels(server(), { [MENU.channelId]: target });

		expect(await publishRoleMenu(guild, MENU)).toBe("500000000000000009");
		expect(target.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
		expect(remembered).toHaveBeenCalledWith(MENU.guildId, MENU.id, "500000000000000009");
	});

	it("refuses a channel it cannot post in, and a menu with nothing on it", async () => {
		const guild = withChannels(server(), {});

		await expect(publishRoleMenu(guild, MENU)).rejects.toBeInstanceOf(UserFacingError);
		await expect(publishRoleMenu(guild, { ...MENU, roleIds: [] })).rejects.toThrow(/at least one role/);
	});

	/** Moving a posted menu takes the old post down, so two copies never hand out roles side by side. */
	it("moves a posted menu to its new channel", async () => {
		const old = channel();
		const next = channel();
		const guild = withChannels(server(), { [MENU.channelId]: old, "400000000000000002": next });
		const posted = { ...MENU, messageId: "500000000000000001" };
		updated.mockResolvedValue({ ...posted, messageId: null, channelId: "400000000000000002" });

		const result = await changeRoleMenu(guild, posted, { channelId: "400000000000000002" }, "1");

		expect(old.messages.delete).toHaveBeenCalledWith("500000000000000001");
		expect(next.send).toHaveBeenCalledTimes(1);
		expect(result.menu.messageId).toBe("500000000000000009");
	});
});
