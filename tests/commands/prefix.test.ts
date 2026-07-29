import { PermissionFlagsBits } from "discord.js";
import { dispatch } from "@core/command";
import { UserFacingError } from "@core/errors";
import { createMockClient, createMockSubcommandInteraction, GUILD_ID } from "@tests/helpers/mocks";

const config = { prefix: "t?", isEnabled: true };
const setPrefix = jest.fn((_guildId: string, prefix: string) => Promise.resolve(prefix));
const setPrefixEnabled = jest.fn(() => Promise.resolve(config));

jest.mock("@database/repositories/settingsRepository", () => ({
	getPrefixConfig: jest.fn(() => Promise.resolve(config)),
	setPrefix: (...args: [string, string]) => setPrefix(...args),
	setPrefixEnabled: () => setPrefixEnabled(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const command = require("@commands/settings/prefix.command").default as Parameters<typeof dispatch>[1];

function run(subcommand: string, options: Record<string, string> = {}, canManage = true) {
	const interaction = createMockSubcommandInteraction(subcommand, { options });

	(interaction.member as unknown as { permissions: { has: jest.Mock } }).permissions.has = jest.fn(
		(flag: bigint) => canManage || flag !== PermissionFlagsBits.ManageGuild,
	);

	return { interaction, done: dispatch(interaction, command, createMockClient()) };
}

describe("/prefix", () => {
	beforeEach(() => {
		config.prefix = "t?";
		config.isEnabled = true;
	});

	it("shows the current prefix", async () => {
		const { interaction, done } = run("show");
		await done;

		expect(JSON.stringify(interaction.sent)).toContain("t?");
	});

	it("says so when text commands are switched off", async () => {
		config.isEnabled = false;
		const { interaction, done } = run("show");
		await done;

		expect(JSON.stringify(interaction.sent)).toContain("off");
	});

	it("saves a new prefix", async () => {
		const { done } = run("set", { prefix: "!" });
		await done;

		expect(setPrefix).toHaveBeenCalledWith(GUILD_ID, "!");
	});

	it("refuses a prefix that is too long", async () => {
		await expect(run("set", { prefix: "toolongprefix" }).done).rejects.toThrow(UserFacingError);
	});

	it("refuses a prefix containing a space", async () => {
		await expect(run("set", { prefix: "a b" }).done).rejects.toThrow(/space/);
	});

	it("refuses to change anything without Manage Server", async () => {
		await expect(run("set", { prefix: "!" }, false).done).rejects.toThrow(/Manage Server/);
		await expect(run("enable", {}, false).done).rejects.toThrow(/Manage Server/);
	});

	it("turns text commands on and off", async () => {
		await run("enable").done;
		await run("disable").done;

		expect(setPrefixEnabled).toHaveBeenCalledTimes(2);
	});
});
