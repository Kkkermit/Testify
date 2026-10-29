import { ChannelType, Collection, type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	findOwnedTempChannel,
	findTempChannel,
	forgetTempChannel,
	getTempVoiceSettings,
	listTempChannels,
	saveTempVoiceSettings,
	type StoredTempVoiceSettings,
} from "@database/repositories/tempVoiceRepository";
import {
	applyTempVoiceSettings,
	handleVoiceChange,
	makeLobby,
	parseNameTemplate,
	parseUserLimit,
	sweepTempChannels,
} from "@lib/tempVoice/tempVoiceActions.util";
import { tempVoiceSettingsPanel } from "@lib/tempVoice/tempVoicePanel.util";
import { textOf } from "@tests/helpers/containers";

jest.mock("@database/repositories/tempVoiceRepository", () => ({
	countTempChannels: jest.fn(() => Promise.resolve(0)),
	findOwnedTempChannel: jest.fn(() => Promise.resolve(null)),
	findTempChannel: jest.fn(() => Promise.resolve(null)),
	forgetTempChannel: jest.fn(() => Promise.resolve(true)),
	getTempVoiceSettings: jest.fn(),
	listTempChannels: jest.fn(() => Promise.resolve([])),
	recordTempChannel: jest.fn(() => Promise.resolve()),
	saveTempVoiceSettings: jest.fn(() => Promise.resolve({})),
}));

const GUILD = "900000000000000001";
const LOBBY = "400000000000000001";
const CATEGORY = "400000000000000002";
const MADE = "400000000000000099";
const ALICE = "100000000000000001";
const OWNER = "100000000000000009";

const settings = (overrides: Partial<StoredTempVoiceSettings> = {}): StoredTempVoiceSettings => ({
	enabled: true,
	lobbyChannelId: LOBBY,
	categoryId: null,
	nameTemplate: "{user}'s channel",
	userLimit: 0,
	...overrides,
});

interface FakeChannel {
	id: string;
	type: ChannelType;
	parentId: string | null;
	members: { size: number };
	isVoiceBased: () => boolean;
	delete: jest.Mock;
	permissionOverwrites: { create: jest.Mock };
}

function channel(
	id: string,
	type = ChannelType.GuildVoice,
	members = 0,
	parentId: string | null = CATEGORY,
): FakeChannel {
	return {
		id,
		type,
		parentId,
		members: { size: members },
		isVoiceBased: () => type === ChannelType.GuildVoice,
		delete: jest.fn(() => Promise.resolve()),
		permissionOverwrites: { create: jest.fn(() => Promise.resolve()) },
	};
}

function world(options: { canManage?: boolean; channels?: FakeChannel[] } = {}) {
	const cache = new Collection<string, FakeChannel>(
		(options.channels ?? [channel(LOBBY), channel(CATEGORY, ChannelType.GuildCategory, 0, null)]).map((entry) => [
			entry.id,
			entry,
		]),
	);
	const created = channel(MADE);
	const guild = {
		id: GUILD,
		members: { me: { permissions: { has: () => options.canManage ?? true } } },
		channels: {
			cache,
			create: jest.fn(() => {
				cache.set(MADE, created);
				return Promise.resolve(created);
			}),
		},
	};
	return { guild, created, cache };
}

function member(options: { bot?: boolean; moves?: boolean } = {}) {
	return {
		id: ALICE,
		displayName: "Alice",
		user: { bot: options.bot ?? false, username: "alice" },
		voice: {
			setChannel: jest.fn(() => (options.moves === false ? Promise.reject(new Error("left")) : Promise.resolve())),
		},
	};
}

const state = (guild: object, channelId: string | null, who: object | null = member()) =>
	({ guild, channelId, member: who }) as never;
const client = (paused = false) =>
	({ paused, logger: { debug: jest.fn() }, guilds: { cache: new Collection() } }) as unknown as TestifyClient;

let now = 1_000_000;

beforeEach(() => {
	jest.clearAllMocks();
	now += 60_000;
	jest.mocked(getTempVoiceSettings).mockResolvedValue(settings());
	jest.mocked(findOwnedTempChannel).mockResolvedValue(null);
	jest.mocked(findTempChannel).mockResolvedValue(null);
});

describe("joining the lobby", () => {
	it("puts it in the chosen category, with the chosen limit", async () => {
		jest.mocked(getTempVoiceSettings).mockResolvedValue(settings({ categoryId: "400000000000000003", userLimit: 4 }));
		const { guild } = world();

		await handleVoiceChange(client(), state(guild, null), state(guild, LOBBY), now);

		expect(guild.channels.create).toHaveBeenCalledWith(
			expect.objectContaining({ parent: "400000000000000003", userLimit: 4 }),
		);
	});

	/** A second trip through the lobby goes back to the channel they have, rather than making another. */
	it("sends somebody who already has a channel back to it", async () => {
		const mine = channel("400000000000000050", ChannelType.GuildVoice, 2);
		const { guild } = world({ channels: [channel(LOBBY), mine] });
		jest.mocked(findOwnedTempChannel).mockResolvedValue({ guildId: GUILD, channelId: mine.id, ownerId: ALICE });
		const alice = member();

		await handleVoiceChange(client(), state(guild, null, alice), state(guild, LOBBY, alice), now);

		expect(guild.channels.create).not.toHaveBeenCalled();
		expect(alice.voice.setChannel).toHaveBeenCalledWith(mine);
	});

	it("makes no more than one channel per person in a short space of time", async () => {
		const { guild } = world();

		await handleVoiceChange(client(), state(guild, null), state(guild, LOBBY), now);
		await handleVoiceChange(client(), state(guild, null), state(guild, LOBBY), now + 1_000);

		expect(guild.channels.create).toHaveBeenCalledTimes(1);
	});

	it("does nothing while off, for a bot, while paused, or without the permissions", async () => {
		const off = world();
		jest.mocked(getTempVoiceSettings).mockResolvedValueOnce(settings({ enabled: false }));
		await handleVoiceChange(client(), state(off.guild, null), state(off.guild, LOBBY), now);

		const bot = world();
		const robot = member({ bot: true });
		await handleVoiceChange(client(), state(bot.guild, null, robot), state(bot.guild, LOBBY, robot), now);

		const paused = world();
		await handleVoiceChange(client(true), state(paused.guild, null), state(paused.guild, LOBBY), now);

		const powerless = world({ canManage: false });
		await handleVoiceChange(client(), state(powerless.guild, null), state(powerless.guild, LOBBY), now);

		for (const { guild } of [off, bot, paused, powerless]) expect(guild.channels.create).not.toHaveBeenCalled();
	});
});

describe("leaving a channel", () => {
	/** Somebody else's ordinary channel emptying is none of this feature's business. */
	it("leaves alone a channel it did not make, and one with people still in it", async () => {
		const ordinary = channel("400000000000000060");
		const busy = channel(MADE, ChannelType.GuildVoice, 1);
		const { guild } = world({ channels: [ordinary, busy] });

		await handleVoiceChange(client(), state(guild, ordinary.id), state(guild, null), now);
		jest.mocked(findTempChannel).mockResolvedValue({ guildId: GUILD, channelId: MADE, ownerId: ALICE });
		await handleVoiceChange(client(), state(guild, MADE), state(guild, null), now);

		expect(ordinary.delete).not.toHaveBeenCalled();
		expect(busy.delete).not.toHaveBeenCalled();
	});
});

describe("sweepTempChannels", () => {
	it("deletes what emptied while the bot was away, and forgets what somebody deleted by hand", async () => {
		const empty = channel(MADE);
		const full = channel("400000000000000098", ChannelType.GuildVoice, 3);
		const { guild } = world({ channels: [empty, full] });
		const awake = client();
		awake.guilds.cache.set(GUILD, guild as never);
		jest.mocked(listTempChannels).mockResolvedValue([
			{ guildId: GUILD, channelId: MADE, ownerId: ALICE },
			{ guildId: GUILD, channelId: full.id, ownerId: ALICE },
			{ guildId: GUILD, channelId: "400000000000000097", ownerId: ALICE },
			{ guildId: "900000000000000005", channelId: "400000000000000096", ownerId: ALICE },
		]);
		jest
			.mocked(findTempChannel)
			.mockImplementation((_guild, id) => Promise.resolve({ guildId: GUILD, channelId: id, ownerId: ALICE }));

		await sweepTempChannels(awake);

		expect(empty.delete).toHaveBeenCalled();
		expect(full.delete).not.toHaveBeenCalled();
		expect(forgetTempChannel).toHaveBeenCalledWith(GUILD, "400000000000000097");
		expect(forgetTempChannel).not.toHaveBeenCalledWith(expect.anything(), "400000000000000096");
	});
});

describe("settings", () => {
	it("refuses a lobby that is not a voice channel, and a category that is not one", async () => {
		const { guild } = world({ channels: [channel("400000000000000070", ChannelType.GuildText)] });

		await expect(
			applyTempVoiceSettings(guild as unknown as Guild, { lobbyChannelId: "400000000000000070" }, OWNER),
		).rejects.toThrow(/voice channel/);
		await expect(
			applyTempVoiceSettings(guild as unknown as Guild, { categoryId: "400000000000000070" }, OWNER),
		).rejects.toThrow(/category/);
	});

	it("will not turn on with no lobby, and turns off when the lobby is cleared", async () => {
		const { guild } = world();
		jest.mocked(getTempVoiceSettings).mockResolvedValue(null);

		await expect(applyTempVoiceSettings(guild as unknown as Guild, { enabled: true }, OWNER)).rejects.toThrow(
			UserFacingError,
		);
		await applyTempVoiceSettings(guild as unknown as Guild, { lobbyChannelId: null }, OWNER);
		expect(saveTempVoiceSettings).toHaveBeenCalledWith(GUILD, expect.objectContaining({ enabled: false }), OWNER);
	});

	it("makes a lobby voice channel and makes it the lobby", async () => {
		const { guild } = world();
		jest.mocked(getTempVoiceSettings).mockResolvedValue(settings({ lobbyChannelId: null, categoryId: CATEGORY }));

		await makeLobby(guild as unknown as Guild, OWNER);

		expect(guild.channels.create).toHaveBeenCalledWith(
			expect.objectContaining({ name: "➕ New channel", type: ChannelType.GuildVoice, parent: CATEGORY }),
		);
		expect(saveTempVoiceSettings).toHaveBeenCalledWith(GUILD, expect.objectContaining({ lobbyChannelId: MADE }), OWNER);
	});

	it("will not make a lobby without the permissions", async () => {
		const { guild } = world({ canManage: false });

		await expect(makeLobby(guild as unknown as Guild, OWNER)).rejects.toThrow(/Manage Channels/);
	});

	it("reads typed names and limits, and refuses the rest in words", () => {
		expect(parseNameTemplate("  🎮 {user}  ")).toBe("🎮 {user}");
		expect(() => parseNameTemplate(" ")).toThrow(UserFacingError);
		expect(parseUserLimit("")).toBe(0);
		expect(parseUserLimit("5")).toBe(5);
		for (const bad of ["100", "-1", "2.5", "lots"]) expect(() => parseUserLimit(bad)).toThrow(UserFacingError);
	});
});

describe("tempVoiceSettingsPanel", () => {
	const base = {
		enabled: false,
		lobbyChannelId: null,
		categoryId: null,
		nameTemplate: "{user}'s channel",
		userLimit: 0,
		canManage: true,
		active: 0,
	};

	it("says when the bot cannot make channels at all", () => {
		expect(textOf(tempVoiceSettingsPanel({ ...base, canManage: false }, OWNER))).toContain("I cannot make channels");
	});
});
