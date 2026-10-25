import { ChannelType, Collection, DiscordAPIError, PermissionFlagsBits, RESTJSONErrorCodes } from "discord.js";
import { UserFacingError } from "@core/errors";
import { setAuditLogConfig } from "@database/repositories/auditLogRepository";
import { getLevelSettings, saveLevelSettings } from "@database/repositories/levelRepository";
import { getWelcome, saveWelcome } from "@database/repositories/welcomeRepository";
import {
	privateLogChannel,
	readSetupChecklist,
	runSetupStep,
	type SetupActor,
	welcomeChannel,
} from "@lib/settings/setupChecklist.util";
import { AUDIT_LOG_CHANNEL_NAME, DEFAULT_WELCOME_MESSAGE } from "@testify/shared";

jest.mock("@database/repositories/levelRepository", () => ({
	getLevelSettings: jest.fn(() => Promise.resolve(null)),
	saveLevelSettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/auditLogRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
	setAuditLogConfig: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/welcomeRepository", () => ({
	getWelcome: jest.fn(() => Promise.resolve(null)),
	saveWelcome: jest.fn(() => Promise.resolve({})),
}));

const GUILD = "900000000000000001";
const ME = "200000000000000001";
const USER = "100000000000000001";
const EVERYONE = { id: GUILD };

interface Options {
	bot?: boolean;
	everyone?: boolean;
	member?: boolean;
	type?: ChannelType;
}

function channel(id: string, name: string, rawPosition: number, options: Options = {}) {
	const { bot = true, everyone = true, member = true, type = ChannelType.GuildText } = options;
	return {
		id,
		name,
		rawPosition,
		type,
		memberCan: member,
		isTextBased: () => true,
		permissionsFor: (who: unknown) => ({ has: () => (who === EVERYONE ? everyone : bot) }),
	};
}

type FakeChannel = ReturnType<typeof channel>;

function guildWith(channels: FakeChannel[], { systemChannelId = null as string | null, botManages = true } = {}) {
	return {
		id: GUILD,
		systemChannelId,
		roles: { everyone: EVERYONE },
		members: { me: { id: ME, permissions: { has: () => botManages } } },
		channels: {
			cache: new Collection(channels.map((entry) => [entry.id, entry])),
			create: jest.fn((options: { name: string }) => Promise.resolve({ id: "400000000000000099", name: options.name })),
		},
	};
}

function member(manages = true): SetupActor {
	return {
		isOwner: false,
		member: {
			id: USER,
			permissionsIn: (target: FakeChannel) => ({ has: () => target.memberCan }),
			permissions: { has: (flag: bigint) => flag === PermissionFlagsBits.ManageChannels && manages },
		} as never,
	};
}

const owner: SetupActor = { isOwner: true, member: undefined };

beforeEach(() => {
	jest.clearAllMocks();
});

describe("welcomeChannel", () => {
	it("prefers the channel Discord already posts join messages in", () => {
		const guild = guildWith([channel("1", "general", 0), channel("2", "arrivals", 1)], { systemChannelId: "2" });

		expect(welcomeChannel(guild as never, member())?.id).toBe("2");
	});

	it("then one named for greeting, then the first there is", () => {
		expect(
			welcomeChannel(guildWith([channel("1", "rules", 0), channel("2", "general", 1)]) as never, member())?.id,
		).toBe("2");
		expect(welcomeChannel(guildWith([channel("1", "rules", 3), channel("2", "news", 1)]) as never, member())?.id).toBe(
			"2",
		);
	});

	/** One click must never aim the bot somewhere its person could not have picked by hand. */
	it("skips a channel the person cannot post in, or the bot cannot", () => {
		const guild = guildWith([
			channel("1", "welcome", 0, { member: false }),
			channel("2", "general", 1, { bot: false }),
			channel("3", "chat", 2),
		]);

		expect(welcomeChannel(guild as never, member())?.id).toBe("3");
		expect(welcomeChannel(guild as never, owner)?.id).toBe("1");
	});

	it("only picks a text channel", () => {
		const guild = guildWith([channel("1", "welcome", 0, { type: ChannelType.GuildVoice })]);

		expect(welcomeChannel(guild as never, member())).toBeNull();
	});
});

describe("privateLogChannel", () => {
	/** An audit log posts deleted messages, so a public channel would publish them. */
	it("never reuses a channel everybody can read", () => {
		const guild = guildWith([channel("1", "mod-log", 0), channel("2", "audit", 1, { everyone: false })]);

		expect(privateLogChannel(guild as never, member())?.id).toBe("2");
		expect(privateLogChannel(guildWith([channel("1", "mod-log", 0)]) as never, member())).toBeNull();
	});

	it("only reuses one whose name says it is for logs", () => {
		expect(privateLogChannel(guildWith([channel("1", "staff", 0, { everyone: false })]) as never, member())).toBeNull();
	});
});

describe("readSetupChecklist", () => {
	it("reports what is done from what is stored", async () => {
		jest.mocked(getLevelSettings).mockResolvedValueOnce({ isDisabled: false } as never);
		jest.mocked(getWelcome).mockResolvedValueOnce({ channelId: "1" } as never);

		const { steps } = await readSetupChecklist(guildWith([channel("1", "general", 0)]) as never, member());

		expect(steps.map((step) => [step.step, step.done])).toEqual([
			["levelling", true],
			["welcome", true],
			["audit-log", false],
		]);
	});

	it("says where each one-click start would post", async () => {
		const guild = guildWith([channel("1", "general", 0), channel("2", "mod-log", 1, { everyone: false })]);

		const { steps } = await readSetupChecklist(guild as never, member());

		expect(steps[1]).toMatchObject({ channelId: "1", channelName: "general", blocker: null });
		expect(steps[2]).toMatchObject({ channelId: "2", channelName: "mod-log", createsChannel: false });
	});

	it("offers a new private channel when there is none to reuse, if both sides may make one", async () => {
		const guild = guildWith([channel("1", "general", 0)]);

		expect((await readSetupChecklist(guild as never, member())).steps[2]).toMatchObject({
			channelId: null,
			channelName: AUDIT_LOG_CHANNEL_NAME,
			createsChannel: true,
			blocker: null,
		});
		expect((await readSetupChecklist(guild as never, member(false))).steps[2]?.blocker).toBe("you_cannot_create");
		expect((await readSetupChecklist(guild as never, owner)).steps[2]?.blocker).toBeNull();
		expect((await readSetupChecklist(guildWith([], { botManages: false }) as never, owner)).steps[2]?.blocker).toBe(
			"bot_cannot_create",
		);
	});

	it("says so when there is nowhere to greet", async () => {
		expect((await readSetupChecklist(guildWith([]) as never, member())).steps[1]?.blocker).toBe("no_channel");
	});
});

describe("runSetupStep", () => {
	it("turns levelling on and nothing else", async () => {
		await runSetupStep(guildWith([]) as never, member(), "levelling");

		expect(saveLevelSettings).toHaveBeenCalledWith(GUILD, { isDisabled: false });
	});

	it("greets in the channel it named, with the default message", async () => {
		const result = await runSetupStep(guildWith([channel("1", "general", 0)]) as never, member(), "welcome");

		expect(saveWelcome).toHaveBeenCalledWith(GUILD, {
			channelId: "1",
			message: DEFAULT_WELCOME_MESSAGE,
			style: "card",
		});
		expect(result.channelId).toBe("1");
	});

	it("logs every event to the private channel it found", async () => {
		const guild = guildWith([channel("2", "mod-log", 0, { everyone: false })]);

		await runSetupStep(guild as never, member(), "audit-log");

		expect(guild.channels.create).not.toHaveBeenCalled();
		expect(setAuditLogConfig).toHaveBeenCalledWith(GUILD, "2", ["all"]);
	});

	it("makes a channel only the bot, its person and administrators can read", async () => {
		const guild = guildWith([]);

		await runSetupStep(guild as never, member(), "audit-log");

		const options = guild.channels.create.mock.calls[0]?.[0] as unknown as {
			name: string;
			permissionOverwrites: { id: string; allow?: bigint[]; deny?: bigint[] }[];
		};
		expect(options.name).toBe(AUDIT_LOG_CHANNEL_NAME);
		expect(options.permissionOverwrites).toEqual(
			expect.arrayContaining([
				{ id: GUILD, deny: [PermissionFlagsBits.ViewChannel] },
				expect.objectContaining({ id: ME, allow: expect.arrayContaining([PermissionFlagsBits.SendMessages]) }),
				{ id: USER, allow: [PermissionFlagsBits.ViewChannel] },
			]),
		);
		expect(setAuditLogConfig).toHaveBeenCalledWith(GUILD, "400000000000000099", ["all"]);
	});

	/** A second press, or a stale page, must never overwrite a configuration somebody chose. */
	it("leaves a step that is already done exactly as it is", async () => {
		jest.mocked(getWelcome).mockResolvedValue({ channelId: "1" } as never);

		await expect(runSetupStep(guildWith([channel("9", "general", 0)]) as never, member(), "welcome")).rejects.toThrow(
			UserFacingError,
		);
		expect(saveWelcome).not.toHaveBeenCalled();
		jest.mocked(getWelcome).mockResolvedValue(null);
	});

	it("refuses a blocked step rather than guessing", async () => {
		await expect(runSetupStep(guildWith([]) as never, member(false), "audit-log")).rejects.toThrow(/Manage Channels/);
		expect(setAuditLogConfig).not.toHaveBeenCalled();
	});

	it("turns Discord refusing the new channel into advice", async () => {
		const guild = guildWith([]);
		guild.channels.create.mockRejectedValueOnce(
			new DiscordAPIError(
				{ code: RESTJSONErrorCodes.MissingPermissions, message: "Missing Permissions" },
				RESTJSONErrorCodes.MissingPermissions,
				403,
				"POST",
				"/guilds/x/channels",
				{ body: undefined, files: undefined },
			),
		);

		await expect(runSetupStep(guild as never, member(), "audit-log")).rejects.toThrow(UserFacingError);
		expect(setAuditLogConfig).not.toHaveBeenCalled();
	});
});
