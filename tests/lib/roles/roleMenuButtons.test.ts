import { MessageFlags, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import roleMenu from "@buttons/roleMenu";
import roleMenuAdmin from "@buttons/roleMenuAdmin";
import { checkOpenControl } from "@core/checks";
import { findRoleMenu, type StoredRoleMenu, updateRoleMenu } from "@database/repositories/roleMenuRepository";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { textOf } from "@tests/helpers/containers";
import { fakeGuild, fakeMember } from "@tests/helpers/roles";

jest.mock("@core/checks", () => ({
	...jest.requireActual<object>("@core/checks"),
	checkOpenControl: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/roleMenuRepository", () => ({
	countRoleMenus: jest.fn(() => Promise.resolve(0)),
	createRoleMenu: jest.fn(),
	deleteRoleMenu: jest.fn(() => Promise.resolve(null)),
	findRoleMenu: jest.fn(),
	listRoleMenus: jest.fn(() => Promise.resolve([])),
	setRoleMenuMessage: jest.fn(() => Promise.resolve()),
	updateRoleMenu: jest.fn(),
}));

const gate = jest.mocked(checkOpenControl);
const found = jest.mocked(findRoleMenu);
const updated = jest.mocked(updateRoleMenu);

const MANAGER = "100000000000000001";
const MENU: StoredRoleMenu = {
	id: "6650a1b2c3d4e5f6a7b8c9d0",
	guildId: "900000000000000001",
	channelId: "400000000000000001",
	messageId: null,
	title: "Pings",
	description: "",
	roleIds: ["red", "blue"],
	mode: "many",
	updatedBy: null,
};

function setting() {
	const guild = fakeGuild([
		{ id: "red", name: "Red", position: 5 },
		{ id: "blue", name: "Blue", position: 6 },
		{ id: "high", name: "High", position: 45 },
		{ id: "mods", name: "Mods", position: 8, permissions: [PermissionFlagsBits.KickMembers] },
	]);
	const presser = fakeMember(guild, MANAGER, ["red"], 40);
	const fetch = jest.fn(() => Promise.resolve(presser.member));
	const messageDelete = jest.fn(() => Promise.resolve());
	Object.assign(guild, {
		members: { ...guild.members, fetch },
		channels: {
			fetch: jest.fn(() => Promise.resolve({ isTextBased: () => true, messages: { delete: messageDelete } })),
		},
	});

	return { guild, presser, messageDelete };
}

function interaction(guild: unknown, kind: "button" | "string" | "role", values: string[] = []) {
	return {
		guild,
		user: { id: MANAGER },
		channelId: "400000000000000001",
		memberPermissions: new PermissionsBitField([PermissionFlagsBits.ManageRoles]),
		values,
		isMessageComponent: () => true,
		isButton: () => kind === "button",
		isStringSelectMenu: () => kind === "string",
		isRoleSelectMenu: () => kind === "role",
		isModalSubmit: () => false,
		reply: jest.fn(() => Promise.resolve()),
		update: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const context = (action: string, ...args: string[]) => ({ client: {} as never, action, args });
const sentWith = (fn: jest.Mock): ContainerMessage => (fn.mock.calls[0] as unknown as [ContainerMessage])[0];

beforeEach(() => {
	jest.clearAllMocks();
	gate.mockResolvedValue(null);
	found.mockResolvedValue(MENU);
});

describe("the posted menu's button", () => {
	it("opens the picker privately, ticked with what the member holds", async () => {
		const { guild } = setting();
		const pressed = interaction(guild, "button");

		await roleMenu.run(pressed as never, context("open", MENU.id));

		const [reply] = pressed.reply.mock.calls[0] as unknown as [{ flags: number }];
		expect(reply.flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
		expect(found).toHaveBeenCalledWith("900000000000000001", MENU.id);
	});

	/** It carries no owner, so the pause, the blacklist and the command's switch are what stand in the way. */
	it("refuses somebody the bot would refuse, before anything changes", async () => {
		gate.mockResolvedValue("You are blocked.");
		const { guild, presser } = setting();

		await expect(
			roleMenu.run(interaction(guild, "string", ["blue"]) as never, context("pick", MENU.id)),
		).rejects.toThrow(/blocked/);
		expect(presser.add).not.toHaveBeenCalled();
		expect(gate).toHaveBeenCalledWith(expect.anything(), expect.anything(), "role-menu");
	});
});

describe("the manager's panel", () => {
	/** The rule the dashboard enforces: nothing above the manager's own role, and nothing that moderates. */
	it("keeps the roles it may offer and names the ones it refused", async () => {
		const { guild } = setting();
		updated.mockImplementation((_guild, _id, fields) => Promise.resolve({ ...MENU, ...fields }));
		const picked = interaction(guild, "role", ["red", "high", "mods"]);

		await roleMenuAdmin.run(picked as never, context("roles", MENU.id, MANAGER));

		expect(updated).toHaveBeenCalledWith(MENU.guildId, MENU.id, { roleIds: ["red"] }, MANAGER);
		const shown = textOf(sentWith(picked.update));
		expect(shown).toMatch(/High sits at or above your own highest role/);
		expect(shown).toMatch(/Mods carries moderation or admin permissions/);
	});
});
