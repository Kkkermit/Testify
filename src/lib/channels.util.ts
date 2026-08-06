import { type Guild, type GuildBasedChannel, PermissionFlagsBits } from "discord.js";

/** Whether Testify could actually post in a channel, which is what lets a picker grey one out before a save. */
export function canPostIn(guild: Guild, channelId: string): boolean {
	const channel = guild.channels.cache.get(channelId);

	return channel === undefined ? false : canPostInChannel(guild, channel);
}

export function canPostInChannel(guild: Guild, channel: GuildBasedChannel): boolean {
	const me = guild.members.me;

	return (
		me !== null &&
		channel.isTextBased() &&
		channel.permissionsFor(me).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])
	);
}
