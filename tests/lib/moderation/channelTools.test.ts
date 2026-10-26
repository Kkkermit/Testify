import {
	ChannelType,
	Collection,
	type Guild,
	type GuildMember,
	PermissionFlagsBits,
	PermissionsBitField,
} from "discord.js";
import { UserFacingError } from "@core/errors";
import {
	readChannelTools,
	setLocked,
	setSlowmode,
	textChannelOf,
	toolChannel,
} from "@lib/moderation/channelTools.util";

const GUILD = "900000000000000001";
const READER = { id: "100000000000000001" } as GuildMember;
const ME = { id: "100000000000000009" };

function channelOf(options: {
	id?: string;
	name?: string;
	locked?: boolean;
	slowmode?: number;
	readerMay?: boolean;
	botFlags?: bigint[];
	parent?: { name: string; position: number } | null;
	rawPosition?: number;
}) {
	const deny = new PermissionsBitField(options.locked === true ? [PermissionFlagsBits.SendMessages] : []);
	return {
		id: options.id ?? "400000000000000001",
		name: options.name ?? "general",
		type: ChannelType.GuildText,
		rawPosition: options.rawPosition ?? 0,
		parent: options.parent ?? null,
		rateLimitPerUser: options.slowmode ?? 0,
		permissionOverwrites: {
			cache: new Collection(options.locked === undefined ? [] : [[GUILD, { deny }]]),
			edit: jest.fn(() => Promise.resolve()),
		},
		setRateLimitPerUser: jest.fn(() => Promise.resolve()),
		permissionsFor: (who: { id: string }) =>
			new PermissionsBitField(
				who.id === ME.id
					? (options.botFlags ?? [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels])
					: options.readerMay === false
						? []
						: [PermissionFlagsBits.ManageChannels],
			),
	};
}

function guildWith(channels: ReturnType<typeof channelOf>[]) {
	return {
		id: GUILD,
		roles: { everyone: { id: GUILD } },
		members: { me: ME },
		channels: {
			cache: new Collection<string, unknown>([
				...channels.map((channel) => [channel.id, channel] as const),
				["400000000000000099", { id: "400000000000000099", type: ChannelType.GuildVoice }] as const,
			]),
		},
	} as unknown as Guild;
}

describe("toolChannel", () => {
	it("reads a lock from @everyone's overwrite, and the slowmode", () => {
		const channel = channelOf({ locked: true, slowmode: 30 });

		expect(toolChannel(channel as never, guildWith([channel]), READER)).toEqual(
			expect.objectContaining({ locked: true, slowmodeSeconds: 30, canLock: true, canSlow: true }),
		);
	});

	/** A server-wide Manage Channels can be taken away in one channel, and the bot's own rights are per channel too. */
	it("says what the reader and the bot may change in this channel", () => {
		const readerCannot = channelOf({ readerMay: false });
		const botCannotLock = channelOf({ botFlags: [PermissionFlagsBits.ManageChannels] });

		expect(toolChannel(readerCannot as never, guildWith([readerCannot]), READER)).toEqual(
			expect.objectContaining({ canLock: false, canSlow: false }),
		);
		expect(toolChannel(botCannotLock as never, guildWith([botCannotLock]), READER)).toEqual(
			expect.objectContaining({ canLock: false, canSlow: true }),
		);
		expect(toolChannel(readerCannot as never, guildWith([readerCannot]), undefined).canLock).toBe(true);
	});
});

describe("setLocked", () => {
	it("refuses @everyone Send Messages to lock, and clears the overwrite to unlock", async () => {
		const channel = channelOf({});
		const guild = guildWith([channel]);

		await setLocked(channel as never, guild, true, "mod: raid");
		await setLocked(channel as never, guild, false, "mod: over");

		expect(channel.permissionOverwrites.edit).toHaveBeenNthCalledWith(
			1,
			{ id: GUILD },
			{ SendMessages: false },
			{
				reason: "mod: raid",
			},
		);
		expect(channel.permissionOverwrites.edit).toHaveBeenNthCalledWith(
			2,
			{ id: GUILD },
			{ SendMessages: null },
			{
				reason: "mod: over",
			},
		);
	});

	it("refuses a channel with no overwrites, and slowmode where there is none", async () => {
		await expect(setLocked({} as never, guildWith([]), true, "x")).rejects.toThrow(UserFacingError);
		await expect(setSlowmode({} as never, 10, "x")).rejects.toThrow(UserFacingError);
	});
});

describe("readChannelTools", () => {
	it("lists text channels only, in Discord's order", () => {
		const guild = guildWith([
			channelOf({ id: "400000000000000003", name: "rules", rawPosition: 0, parent: { name: "Info", position: 0 } }),
			channelOf({ id: "400000000000000002", name: "chat", rawPosition: 1, parent: { name: "Talk", position: 1 } }),
			channelOf({ id: "400000000000000001", name: "loose", rawPosition: 5, parent: null }),
		]);

		expect(readChannelTools(guild, READER).channels.map((channel) => channel.name)).toEqual(["loose", "rules", "chat"]);
	});

	it("refuses anything that is not a text channel here", () => {
		expect(() => textChannelOf(guildWith([]), "400000000000000099")).toThrow(UserFacingError);
		expect(() => textChannelOf(guildWith([]), "400000000000000123")).toThrow(UserFacingError);
	});
});
