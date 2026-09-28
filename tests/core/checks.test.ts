import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import lottery from "@commands/economy/lottery.command";
import {
	checkCasinoPlay,
	checkMusicControl,
	clearCooldowns,
	OWNER_ONLY_REFUSAL,
	refusalText,
	runChecks,
} from "@core/checks";
import { defineCommand } from "@core/command";
import { refusalEmbed } from "@lib/discord/embeds.util";
import { createMockClient, createMockInteraction, OWNER_ID, USER_ID } from "@tests/helpers/mocks";

const findBlacklistEntry = jest.fn<Promise<{ reason: string; createdAt?: Date } | null>, []>(() =>
	Promise.resolve(null),
);

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

const casinoSettings = jest.fn<
	Promise<{ enabled: boolean; disabledGames: string[]; minBet: number; maxBet: number | null } | null>,
	[]
>(() => Promise.resolve(null));

jest.mock("@database/repositories/casinoRepository", () => ({
	getCasinoSettings: () => casinoSettings(),
	purgeCasino: jest.fn(),
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
	casinoSettings.mockResolvedValue(null);
});

describe("runChecks", () => {
	it("lets an ordinary command through", async () => {
		expect(await runChecks(createMockInteraction(), plain, createMockClient())).toBeNull();
	});

	/** A bare "blocked, reason: x" line left people unsure whether the block was for one server or everywhere. */
	it("blocks a blacklisted user and says why, since when, how far it reaches and who can lift it", async () => {
		findBlacklistEntry.mockResolvedValue({ reason: "Spamming", createdAt: new Date(1_700_000_000_000) });

		const refusal = await runChecks(createMockInteraction(), plain, createMockClient());
		const built = refusalEmbed(refusal!).toJSON();
		const byName = Object.fromEntries((built.fields ?? []).map((field) => [field.name, field.value]));

		expect(built.title).toContain("You are blocked from");
		expect(built.description).toContain("any other");
		expect(byName.Reason).toBe("Spamming");
		expect(byName["Blocked since"]).toBe("<t:1700000000:D> (<t:1700000000:R>)");
		expect(byName["Think this is a mistake?"]).toContain("owner");
		expect(built.color).toBe(refusalEmbed("x").toJSON().color);
		expect(refusalText(refusal!)).toContain("**Reason:** Spamming");
	});

	it("refuses an owner-only command to anyone else", async () => {
		const command = { ...plain, ownerOnly: true };

		expect(await runChecks(createMockInteraction(), command, createMockClient())).toContain("owner");
	});

	/** A blacklisted or paused refusal used to come first, so an attempt at `/eval` went unrecorded. */
	it("records every refused owner-only attempt, whatever else would have refused it", async () => {
		const command = { ...plain, ownerOnly: true };
		const warn = jest.fn();
		findBlacklistEntry.mockResolvedValue({ reason: "Spamming" });
		const client = createMockClient({ paused: true, logger: { warn } } as never);

		expect(await runChecks(createMockInteraction(), command, client)).toBe(OWNER_ONLY_REFUSAL);
		expect(warn).toHaveBeenCalledWith(
			expect.objectContaining({ userId: USER_ID }),
			expect.stringContaining("[OWNER_COMMAND]"),
		);
	});

	it("records nothing when an owner runs an owner-only command", async () => {
		const command = { ...plain, ownerOnly: true };
		const warn = jest.fn();
		const interaction = createMockInteraction({ overrides: { user: { id: OWNER_ID } as never } });

		await runChecks(interaction, command, createMockClient({ logger: { warn } } as never));
		expect(warn).not.toHaveBeenCalled();
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

/** This is the gate, and it runs before the command body on both surfaces. */
describe("commands that have been switched off", () => {
	beforeEach(() => {
		clearCooldowns();
		findBlacklistEntry.mockResolvedValue(null);
		offGlobally.mockResolvedValue([]);
		offInGuild.mockResolvedValue([]);
		musicSettings.mockResolvedValue(null);
	});

	/** "Switched off" read as a fault the reader could fix; it is a pause the owner chose, and it may end. */
	it("says a command the owner switched off everywhere is under maintenance for now", async () => {
		offGlobally.mockResolvedValue(["ping"]);

		const refusal = await runChecks(createMockInteraction(), plain, createMockClient());

		expect(refusal).toEqual({
			title: expect.stringMatching(/under maintenance/) as string,
			message: expect.stringMatching(/`\/ping` off for now\. It may come back/) as string,
		});
	});

	it("words a titled refusal as one piece of text where no heading fits", () => {
		expect(refusalText({ title: "Under maintenance", message: "Back later." })).toBe(
			"**Under maintenance**\nBack later.",
		);
		expect(refusalText("Plain.")).toBe("Plain.");
	});

	it("refuses one this server switched off", async () => {
		offInGuild.mockResolvedValue(["ping"]);

		const refusal = await runChecks(createMockInteraction(), plain, createMockClient());

		expect(refusal).toContain("this server");
	});

	/** Nobody bypasses a switch, the bot owner included. */
	it("refuses the bot owner too", async () => {
		offGlobally.mockResolvedValue(["ping"]);
		const interaction = createMockInteraction({ overrides: { user: { id: OWNER_ID } as never } });

		expect(await runChecks(interaction, plain, createMockClient())).toMatchObject({
			title: expect.stringMatching(/maintenance/) as string,
		});
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

/** A member could once delete the server's lottery, pot and all, because only the dashboard checked. */
describe("the lottery", () => {
	it.each(["setup", "freeze", "delete"])("refuses %s to somebody who cannot manage the server", async (name) => {
		const interaction = createMockInteraction({ subcommand: name, overrides: memberWith(0n) });

		expect(await runChecks(interaction, lottery, createMockClient())).toContain("manage guild");
	});

	it.each(["info", "enter"])("leaves %s open to every member", async (name) => {
		const interaction = createMockInteraction({ subcommand: name, overrides: memberWith(0n) });

		expect(await runChecks(interaction, lottery, createMockClient())).toBeNull();
	});
});

/** The Add to queue button can be pressed by anybody, so it has to pass what `/play` itself would have to. */
describe("checkMusicControl", () => {
	const guildId = "300000000000000001";
	const plainMember = { roles: ["role-listener"], permissions: "0" };
	const manager = { roles: [], permissions: String(PermissionFlagsBits.ManageGuild) };

	const ask = (member: object, client = createMockClient()) =>
		checkMusicControl(client, { userId: USER_ID, guildId, member: member as never });

	it("lets a member through where music is on and open", async () => {
		await expect(ask(plainMember)).resolves.toBeNull();
	});

	it("refuses while the bot is paused", async () => {
		const client = createMockClient();
		client.paused = true;

		await expect(ask(plainMember, client)).resolves.toMatch(/paused/);
	});

	it("refuses a blacklisted account", async () => {
		findBlacklistEntry.mockResolvedValueOnce({ reason: "spam" });

		expect(refusalText((await ask(plainMember))!)).toMatch(/blocked/);
	});

	it("refuses when /play is switched off in the server", async () => {
		offInGuild.mockResolvedValueOnce(["play"]);

		await expect(ask(plainMember)).resolves.toMatch(/switched off/);
	});

	it("refuses when the music system is off, for a manager too", async () => {
		musicSettings.mockResolvedValue({ enabled: false, djRoleIds: [] });

		await expect(ask(manager)).resolves.toMatch(/music system is switched off/);
	});

	it("holds a member without a DJ role back, and lets a manager through", async () => {
		musicSettings.mockResolvedValue({ enabled: true, djRoleIds: ["role-dj"] });

		await expect(ask(plainMember)).resolves.toMatch(/DJ role/);
		await expect(ask(manager)).resolves.toBeNull();
		await expect(ask({ roles: ["role-dj"], permissions: "0" })).resolves.toBeNull();
	});
});

describe("the casino's switches", () => {
	const casino = defineCommand({
		name: "casino",
		description: "Games.",
		category: "casino",
		subcommands: [
			{ name: "roulette", description: "Spins.", run: jest.fn() },
			{ name: "info", description: "Lists.", run: jest.fn() },
			{ name: "settings", description: "Settings.", permissions: [PermissionFlagsBits.ManageGuild], run: jest.fn() },
		],
	});
	const closed = { enabled: false, disabledGames: [], minBet: 1, maxBet: null };

	it("lets a game through in a server that has never configured the casino", async () => {
		expect(await runChecks(createMockInteraction({ subcommand: "roulette" }), casino, createMockClient())).toBeNull();
	});

	it("refuses every game while the casino is closed", async () => {
		casinoSettings.mockResolvedValue(closed);

		expect(await runChecks(createMockInteraction({ subcommand: "roulette" }), casino, createMockClient())).toMatch(
			/closed/,
		);
		expect(await runChecks(createMockInteraction({ subcommand: "info" }), casino, createMockClient())).toMatch(
			/closed/,
		);
	});

	it("refuses a game switched off on its own, and leaves the rest open", async () => {
		casinoSettings.mockResolvedValue({ ...closed, enabled: true, disabledGames: ["roulette"] });

		expect(await runChecks(createMockInteraction({ subcommand: "roulette" }), casino, createMockClient())).toMatch(
			/Roulette is switched off/,
		);
		expect(await runChecks(createMockInteraction({ subcommand: "info" }), casino, createMockClient())).toBeNull();
	});

	/** Closing it has to be reversible from inside Discord, or the server has no way back. */
	it("still lets `/casino settings` through while the casino is closed", async () => {
		casinoSettings.mockResolvedValue(closed);
		const interaction = createMockInteraction({
			subcommand: "settings",
			overrides: memberWith(PermissionsBitField.All),
		});

		expect(await runChecks(interaction, casino, createMockClient())).toBeNull();
	});

	describe("for a Play again button", () => {
		const who = { userId: USER_ID, guildId: "900000000000000001" };

		it("lets a game through where the casino is open", async () => {
			await expect(checkCasinoPlay(createMockClient(), who, "slots")).resolves.toBeNull();
		});

		it("refuses while the bot is paused, or for a blacklisted account", async () => {
			const client = createMockClient();
			client.paused = true;
			await expect(checkCasinoPlay(client, who, "slots")).resolves.toMatch(/paused/);

			findBlacklistEntry.mockResolvedValueOnce({ reason: "spam" });
			expect(refusalText((await checkCasinoPlay(createMockClient(), who, "slots"))!)).toMatch(/blocked/);
		});

		it("refuses when /casino is switched off in the server", async () => {
			offInGuild.mockResolvedValueOnce(["casino"]);

			await expect(checkCasinoPlay(createMockClient(), who, "slots")).resolves.toMatch(/switched off/);
		});

		it("refuses when the casino or that game is off", async () => {
			casinoSettings.mockResolvedValue(closed);
			await expect(checkCasinoPlay(createMockClient(), who, "slots")).resolves.toMatch(/closed/);

			casinoSettings.mockResolvedValue({ ...closed, enabled: true, disabledGames: ["slots"] });
			await expect(checkCasinoPlay(createMockClient(), who, "slots")).resolves.toMatch(/Slots is switched off/);
		});
	});
});
