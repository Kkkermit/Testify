import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { clearCooldowns, runChecks } from "@core/checks";
import { defineCommand } from "@core/command";
import { createMockClient, createMockInteraction, OWNER_ID, USER_ID } from "@tests/helpers/mocks";

const findBlacklistEntry = jest.fn<Promise<{ reason: string } | null>, []>(() => Promise.resolve(null));

jest.mock("@database/repositories/blacklistRepository", () => ({
	findBlacklistEntry: () => findBlacklistEntry(),
	clearBlacklistCache: jest.fn(),
}));

const offGlobally = jest.fn<Promise<string[]>, []>(() => Promise.resolve([]));
const offInGuild = jest.fn<Promise<string[]>, []>(() => Promise.resolve([]));

jest.mock("@database/repositories/commandToggleRepository", () => ({
	disabledGlobally: () => offGlobally(),
	disabledInGuild: () => offInGuild(),
	purgeCommandToggles: jest.fn(),
	clearCommandToggleCache: jest.fn(),
}));

const musicSettings = jest.fn<Promise<{ enabled: boolean; djRoleIds: string[] } | null>, []>(() =>
	Promise.resolve(null),
);

jest.mock("@database/repositories/musicSettingsRepository", () => ({
	getMusicSettings: () => musicSettings(),
	saveMusicSettings: jest.fn(),
	clearMusicSettingsCache: jest.fn(),
	purgeMusicSettings: jest.fn(),
}));

const plain = defineCommand({ name: "ping", description: "Pings.", category: "info", run: jest.fn() });

const music = defineCommand({
	name: "music",
	description: "Controls the player.",
	category: "music",
	subcommands: [
		{ name: "skip", description: "Skips.", run: jest.fn() },
		{
			name: "system",
			description: "Settings.",
			permissions: [PermissionFlagsBits.ManageGuild],
			run: jest.fn(),
		},
	],
});

/** `permissions` as a bitfield string is the shape an uncached member arrives in. */
function memberWith(permissions: bigint, roles: string[] = []): { member: never } {
	return { member: { permissions: permissions.toString(), roles } as never };
}

// `mockResolvedValue` outlives the test that set it, so every suite below starts from the same answers.
beforeEach(() => {
	clearCooldowns();
	findBlacklistEntry.mockResolvedValue(null);
	offGlobally.mockResolvedValue([]);
	offInGuild.mockResolvedValue([]);
	musicSettings.mockResolvedValue(null);
});

describe("runChecks", () => {
	it("lets an ordinary command through", async () => {
		expect(await runChecks(createMockInteraction(), plain, createMockClient())).toBeNull();
	});

	it("blocks a blacklisted user and says why", async () => {
		findBlacklistEntry.mockResolvedValue({ reason: "Spamming" });

		const refusal = await runChecks(createMockInteraction(), plain, createMockClient());

		expect(refusal).toContain("Spamming");
	});

	it("refuses an owner-only command to anyone else", async () => {
		const command = { ...plain, ownerOnly: true };

		expect(await runChecks(createMockInteraction(), command, createMockClient())).toContain("owner");
	});

	it("allows an owner-only command for an owner", async () => {
		const command = { ...plain, ownerOnly: true };
		const interaction = createMockInteraction({ overrides: { user: { id: OWNER_ID } as never } });

		expect(await runChecks(interaction, command, createMockClient())).toBeNull();
	});

	it("refuses a guild-only command in a direct message", async () => {
		const command = { ...plain, guildOnly: true };

		expect(await runChecks(createMockInteraction({ inGuild: false }), command, createMockClient())).toContain("server");
	});

	it("refuses an age-restricted command outside an age-restricted channel", async () => {
		const command = { ...plain, nsfw: true };

		expect(await runChecks(createMockInteraction(), command, createMockClient())).toContain("age-restricted");
	});

	it("names the permissions the user is missing", async () => {
		const command = { ...plain, permissions: [PermissionFlagsBits.BanMembers] };
		const interaction = createMockInteraction({
			overrides: { member: { permissions: "0" } as never },
		});

		const refusal = await runChecks(interaction, command, createMockClient());

		expect(refusal).toContain("ban members");
	});

	it("applies a cooldown, then lets it expire", async () => {
		const command = { ...plain, cooldown: 5_000 };
		const client = createMockClient();

		expect(await runChecks(createMockInteraction(), command, client)).toBeNull();
		expect(await runChecks(createMockInteraction(), command, client)).toContain("Slow down");
	});

	it("does not put the owner on cooldown", async () => {
		const command = { ...plain, cooldown: 5_000 };
		const client = createMockClient();
		const owner = () => createMockInteraction({ overrides: { user: { id: OWNER_ID } as never } });

		expect(await runChecks(owner(), command, client)).toBeNull();
		expect(await runChecks(owner(), command, client)).toBeNull();
	});

	it("keeps cooldowns separate per user", async () => {
		const command = { ...plain, cooldown: 5_000 };
		const client = createMockClient();

		await runChecks(createMockInteraction(), command, client);
		const other = createMockInteraction({ overrides: { user: { id: USER_ID + "9" } as never } });

		expect(await runChecks(other, command, client)).toBeNull();
	});
});

/**
 * Hiding a switch is not access control and neither is a greyed-out button — this is the gate, and it runs
 * before the command body on both surfaces.
 */
describe("commands that have been switched off", () => {
	beforeEach(() => {
		clearCooldowns();
		findBlacklistEntry.mockResolvedValue(null);
		offGlobally.mockResolvedValue([]);
		offInGuild.mockResolvedValue([]);
		musicSettings.mockResolvedValue(null);
	});

	it("refuses one the owner switched off everywhere", async () => {
		offGlobally.mockResolvedValue(["ping"]);

		const refusal = await runChecks(createMockInteraction(), plain, createMockClient());

		expect(refusal).toContain("switched off");
	});

	it("refuses one this server switched off", async () => {
		offInGuild.mockResolvedValue(["ping"]);

		const refusal = await runChecks(createMockInteraction(), plain, createMockClient());

		expect(refusal).toContain("this server");
	});

	/**
	 * Nobody bypasses a switch, the bot owner included: "off" that quietly still runs for one person is a much
	 * worse thing to debug than one that is simply off.
	 */
	it("refuses the bot owner too", async () => {
		offGlobally.mockResolvedValue(["ping"]);
		const interaction = createMockInteraction({ overrides: { user: { id: OWNER_ID } as never } });

		expect(await runChecks(interaction, plain, createMockClient())).toContain("switched off");
	});

	it("lets a command through when a different one is off", async () => {
		offGlobally.mockResolvedValue(["ban"]);
		offInGuild.mockResolvedValue(["rank"]);

		expect(await runChecks(createMockInteraction(), plain, createMockClient())).toBeNull();
	});

	/** A server that switched off `/help` would have no way back inside Discord. */
	it("ignores a stored switch against a command the bot will not let go", async () => {
		const help = { ...plain, name: "help" };
		offGlobally.mockResolvedValue(["help"]);
		offInGuild.mockResolvedValue(["help"]);

		expect(await runChecks(createMockInteraction(), help, createMockClient())).toBeNull();
	});

	/** A direct message has no guild list to consult, and looking one up under a null id would throw. */
	it("does not consult a server list outside a server", async () => {
		const interaction = createMockInteraction({ overrides: { guildId: null, guild: null } });
		offInGuild.mockResolvedValue(["ping"]);

		expect(await runChecks(interaction, plain, createMockClient())).toBeNull();
		expect(offInGuild).not.toHaveBeenCalled();
	});
});

describe("the music system's own switch", () => {
	const skipping = { subcommand: "skip" } as const;

	it("lets music through in a server that has never configured it", async () => {
		expect(await runChecks(createMockInteraction(skipping), music, createMockClient())).toBeNull();
	});

	it("refuses every music command while the system is off", async () => {
		musicSettings.mockResolvedValue({ enabled: false, djRoleIds: [] });

		const refusal = await runChecks(createMockInteraction(skipping), music, createMockClient());

		expect(refusal).toContain("switched off");
	});

	/** Turning it off has to be reversible from inside Discord, or the server has no way back. */
	it("still lets `/music system` through while the system is off", async () => {
		musicSettings.mockResolvedValue({ enabled: false, djRoleIds: [] });
		const interaction = createMockInteraction({
			subcommand: "system",
			overrides: memberWith(PermissionsBitField.All),
		});

		expect(await runChecks(interaction, music, createMockClient())).toBeNull();
	});

	it("refuses somebody holding none of the DJ roles", async () => {
		musicSettings.mockResolvedValue({ enabled: true, djRoleIds: ["dj-role"] });
		const interaction = createMockInteraction({ ...skipping, overrides: memberWith(0n, ["other-role"]) });

		expect(await runChecks(interaction, music, createMockClient())).toContain("DJ role");
	});

	it("lets somebody holding one of them through", async () => {
		musicSettings.mockResolvedValue({ enabled: true, djRoleIds: ["dj-role"] });
		const interaction = createMockInteraction({ ...skipping, overrides: memberWith(0n, ["dj-role"]) });

		expect(await runChecks(interaction, music, createMockClient())).toBeNull();
	});

	it("never applies the gate to a command outside the music category", async () => {
		musicSettings.mockResolvedValue({ enabled: false, djRoleIds: [] });

		expect(await runChecks(createMockInteraction(), plain, createMockClient())).toBeNull();
	});
});

describe("a subcommand that needs its own permissions", () => {
	/** `/music` is open to everybody, so the permission belongs to the one subcommand rather than the command. */
	it("refuses somebody who cannot manage the server", async () => {
		const interaction = createMockInteraction({ subcommand: "system", overrides: memberWith(0n) });

		expect(await runChecks(interaction, music, createMockClient())).toContain("manage guild");
	});

	it("leaves the command's other subcommands open", async () => {
		const interaction = createMockInteraction({ subcommand: "skip", overrides: memberWith(0n) });

		expect(await runChecks(interaction, music, createMockClient())).toBeNull();
	});
});
