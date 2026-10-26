import {
	ChannelType,
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { UserFacingError } from "@core/errors";
import { type ChannelToolList, type ToolChannel } from "@testify/shared";

/** Locking a channel and its slowmode: the one path `/lock`, `/unlock`, `/slowmode` and the dashboard share. */

export function isLocked(channel: GuildBasedChannel, guild: Guild): boolean {
	if (!("permissionOverwrites" in channel)) return false;
	return channel.permissionOverwrites.cache.get(guild.id)?.deny.has(PermissionFlagsBits.SendMessages) === true;
}

/** `null` clears the overwrite rather than allowing it, so unlocking returns the channel to its category's rule. */
export async function setLocked(
	channel: GuildBasedChannel,
	guild: Guild,
	locked: boolean,
	reason: string,
): Promise<void> {
	if (!("permissionOverwrites" in channel)) {
		throw new UserFacingError(`That channel cannot be ${locked ? "locked" : "unlocked"}.`);
	}
	await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: locked ? false : null }, { reason });
}

export async function setSlowmode(channel: GuildBasedChannel, seconds: number, reason: string): Promise<void> {
	if (!("setRateLimitPerUser" in channel)) throw new UserFacingError("That channel does not support slowmode.");
	await channel.setRateLimitPerUser(seconds, reason);
}

/** No reader means a bot owner, who is held only to what the bot itself can do. */
export function toolChannel(channel: TextChannel, guild: Guild, reader: GuildMember | undefined): ToolChannel {
	const me = guild.members.me;
	const readerMay = reader === undefined || channel.permissionsFor(reader).has(PermissionFlagsBits.ManageChannels);
	const botMay = (flag: bigint): boolean => me !== null && channel.permissionsFor(me).has(flag);

	return {
		id: channel.id,
		name: channel.name,
		category: channel.parent?.name ?? null,
		locked: isLocked(channel, guild),
		slowmodeSeconds: channel.rateLimitPerUser,
		canLock: readerMay && botMay(PermissionFlagsBits.ManageRoles),
		canSlow: readerMay && botMay(PermissionFlagsBits.ManageChannels),
	};
}

export function textChannelOf(guild: Guild, channelId: string): TextChannel {
	const channel = guild.channels.cache.get(channelId);
	if (channel?.type !== ChannelType.GuildText) throw new UserFacingError("That is not a text channel in this server.");
	return channel;
}

/** In the order Discord lists them: by category, then by position. */
export function readChannelTools(guild: Guild, reader: GuildMember | undefined): ChannelToolList {
	const channels = [...guild.channels.cache.values()].filter(
		(channel): channel is TextChannel => channel.type === ChannelType.GuildText,
	);
	channels.sort((a, b) => (a.parent?.position ?? -1) - (b.parent?.position ?? -1) || a.rawPosition - b.rawPosition);

	return { channels: channels.map((channel) => toolChannel(channel, guild, reader)) };
}
