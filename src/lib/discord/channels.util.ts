import { type Guild, type GuildBasedChannel, type GuildMember, PermissionFlagsBits } from "discord.js";

/** Whether the bot could actually post in a channel, which is what lets a picker grey one out before a save. */
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

/** Discord hides a channel from whoever cannot view it; a bot owner, who need not be a member, is `undefined` here. */
export function readerSees(channel: GuildBasedChannel, reader: GuildMember | undefined): boolean {
	return reader === undefined || channel.permissionsFor(reader).has(PermissionFlagsBits.ViewChannel);
}
