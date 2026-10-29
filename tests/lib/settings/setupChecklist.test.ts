import { ChannelType, Collection, DiscordAPIError, PermissionFlagsBits, RESTJSONErrorCodes } from "discord.js";
import { UserFacingError } from "@core/errors";
import { setAuditLogConfig } from "@database/repositories/auditLogRepository";
import { getWelcome, saveWelcome } from "@database/repositories/welcomeRepository";
import { privateLogChannel, runSetupStep, type SetupActor, welcomeChannel } from "@lib/settings/setupChecklist.util";

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
});

describe("privateLogChannel", () => {
	/** An audit log posts deleted messages, so a public channel would publish them. */
	it("never reuses a channel everybody can read", () => {
		const guild = guildWith([channel("1", "mod-log", 0), channel("2", "audit", 1, { everyone: false })]);

		expect(privateLogChannel(guild as never, member())?.id).toBe("2");
		expect(privateLogChannel(guildWith([channel("1", "mod-log", 0)]) as never, member())).toBeNull();
	});
});

describe("runSetupStep", () => {
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
