import { type Guild, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import autoRole from "@buttons/autoRole";
import levelling from "@buttons/levelling";
import verify from "@buttons/verify";
import verifySetup from "@buttons/verifySetup";
import { UserFacingError } from "@core/errors";
import { setAutoRoles } from "@database/repositories/autoRoleRepository";
import { findBlacklistEntry } from "@database/repositories/blacklistRepository";
import { getPendingCode, getVerifyConfig, saveVerifyConfig } from "@database/repositories/verificationRepository";
import { fakeGuild, fakeMember } from "@tests/helpers/roles";

jest.mock("@lib/settings/settingsReaders.util", () => ({ SETTING_READERS: {} }));
jest.mock("@database/repositories/autoRoleRepository", () => ({
	getAutoRoles: jest.fn(() => Promise.resolve(null)),
	setAutoRoles: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/verificationRepository", () => ({
	getVerifyConfig: jest.fn(),
	saveVerifyConfig: jest.fn(() => Promise.resolve()),
	deleteVerifyConfig: jest.fn(() => Promise.resolve()),
	getPendingCode: jest.fn(),
	issueCode: jest.fn(() => Promise.resolve("ABC123")),
	isVerified: jest.fn(() => Promise.resolve(false)),
	markVerified: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/levelRepository", () => ({
	getLevelSettings: jest.fn(() => Promise.resolve(null)),
	saveLevelSettings: jest.fn(() => Promise.resolve()),
	deleteLevelSettings: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/blacklistRepository", () => ({
	findBlacklistEntry: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/commandToggleRepository", () => ({
	disabledGlobally: jest.fn(() => Promise.resolve([])),
	disabledInGuild: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@lib/discord", () => ({
	...jest.requireActual<object>("@lib/discord"),
	redrawPanel: jest.fn(() => Promise.resolve()),
}));

const CHOOSER = "100000000000000001";
const MANAGE_ROLES = new PermissionsBitField([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild]);
const MANAGE_SERVER = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);

/** The chooser's own highest role sits at 40; the bot's at 50. */
function server(chooserHolds: PermissionsBitField): { guild: Guild; add: jest.Mock } {
	const guild = fakeGuild([
		{ id: "plain", position: 5 },
		{ id: "admin", position: 45, permissions: [PermissionFlagsBits.Administrator] },
		{ id: "mods", position: 10, permissions: [PermissionFlagsBits.KickMembers] },
	]);
	const { member, add } = fakeMember(guild, CHOOSER, [], 40);
	Object.assign(member, { permissions: chooserHolds });
	Object.assign(guild.members, { fetch: jest.fn(() => Promise.resolve(member)) });
	return { guild, add };
}

function picked(guild: Guild, values: string[], holds: PermissionsBitField) {
	return {
		guild,
		user: { id: CHOOSER },
		locale: "en-GB",
		memberPermissions: holds,
		values,
		isMessageComponent: () => true,
		isRoleSelectMenu: () => true,
		isButton: () => false,
		isModalSubmit: () => false,
		update: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const client = { paused: false, env: { DISCORD_OWNER_IDS: [] } } as never;
const context = (action: string, args: string[] = [CHOOSER]) => ({ client, action, args });

beforeEach(() => {
	jest.clearAllMocks();
	jest
		.mocked(getVerifyConfig)
		.mockResolvedValue({ guildId: "g", channelId: null, roleId: null, message: "Hi", verifiedIds: [] } as never);
});

/** A moderator could set a role above their own as a role on join, then join again on another account to be given it. */
describe("choosing a role the bot hands out by itself, in Discord", () => {
	it("keeps only the roles on join the chooser could give, and nothing that moderates", async () => {
		const { guild } = server(MANAGE_ROLES);

		await autoRole.run(picked(guild, ["plain", "admin", "mods"], MANAGE_ROLES) as never, context("roles"));

		expect(setAutoRoles).toHaveBeenCalledWith(guild.id, ["plain"]);
	});

	/** `/verify` asked only Manage Server, so Admin could be made the prize for pressing Verify. */
	it("refuses a verified role from somebody without Manage Roles, or one above them", async () => {
		const withoutRoles = server(MANAGE_SERVER).guild;
		await verifySetup.run(picked(withoutRoles, ["plain"], MANAGE_SERVER) as never, context("role"));

		const withRoles = server(MANAGE_ROLES).guild;
		await verifySetup.run(picked(withRoles, ["admin"], MANAGE_ROLES) as never, context("role"));

		expect(saveVerifyConfig).not.toHaveBeenCalled();
	});

	/** `/levelling` asked only Manage Server, so Admin could be made a level 1 reward. */
	it("refuses a level reward from somebody without Manage Roles, before asking for the level", async () => {
		const { guild } = server(MANAGE_SERVER);
		const interaction = picked(guild, ["plain"], MANAGE_SERVER);

		await expect(levelling.run(interaction as never, context("reward-role", ["rewards", CHOOSER]))).rejects.toThrow(
			/Manage Roles/,
		);
		expect(interaction.showModal).not.toHaveBeenCalled();
	});
});

describe("pressing Verify", () => {
	function submitted(guild: Guild) {
		return {
			...picked(guild, [], MANAGE_SERVER),
			isRoleSelectMenu: () => false,
			isModalSubmit: () => true,
			fields: { getTextInputValue: () => "ABC123" },
			reply: jest.fn(() => Promise.resolve()),
		};
	}

	/** Whoever verifies is given the role, and it may have been given Kick Members since it was chosen. */
	it("will not hand out a role that now moderates", async () => {
		const { guild, add } = server(MANAGE_SERVER);
		jest.mocked(getVerifyConfig).mockResolvedValue({ guildId: guild.id, roleId: "mods" } as never);
		jest.mocked(getPendingCode).mockResolvedValue({ code: "ABC123" } as never);

		await expect(verify.run(submitted(guild) as never, context("submit", []))).rejects.toThrow(UserFacingError);
		expect(add).not.toHaveBeenCalled();
	});

	it("refuses a blacklisted account, as every control anybody may press does", async () => {
		const { guild, add } = server(MANAGE_SERVER);
		jest.mocked(getVerifyConfig).mockResolvedValue({ guildId: guild.id, roleId: "plain" } as never);
		jest.mocked(getPendingCode).mockResolvedValue({ code: "ABC123" } as never);
		jest.mocked(findBlacklistEntry).mockResolvedValue({ userId: CHOOSER, reason: "spam" } as never);

		await expect(verify.run(submitted(guild) as never, context("submit", []))).rejects.toThrow(UserFacingError);
		expect(add).not.toHaveBeenCalled();
	});
});
