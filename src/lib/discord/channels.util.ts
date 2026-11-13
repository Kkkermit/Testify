import {
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	type GuildTextBasedChannel,
	PermissionFlagsBits,
	type PermissionResolvable,
	PermissionsBitField,
	type PermissionsString,
} from "discord.js";
import { type BotLanguage } from "@config/languages";
import { UserFacingError } from "@core/errors";
import { permissionList, say } from "@core/language";

/** View Channel, then Send Messages, or Send Messages in Threads for a thread, which Discord asks there instead. */
function postingNeeds(channel: GuildBasedChannel, also: readonly PermissionResolvable[]): PermissionResolvable[] {
	return [
		PermissionFlagsBits.ViewChannel,
		channel.isThread() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages,
		...also,
	];
}

export function missingToPost(
	channel: GuildBasedChannel,
	also: readonly PermissionResolvable[] = [],
): PermissionsString[] {
	const needs = postingNeeds(channel, also);
	const me = channel.guild.members.me;

	return me === null ? new PermissionsBitField(needs).toArray() : channel.permissionsFor(me).missing(needs);
}

/** Whether the bot could actually post in a channel, which is what lets a picker grey one out before a save. */
export function canPostIn(guild: Guild, channelId: string): boolean {
	const channel = guild.channels.cache.get(channelId);

	return channel === undefined ? false : canPostInChannel(guild, channel);
}

export function canPostInChannel(guild: Guild, channel: GuildBasedChannel): boolean {
	const me = guild.members.me;

	return me !== null && channel.isTextBased() && channel.permissionsFor(me).has(postingNeeds(channel, []));
}

/** Refuses, naming what is missing, before a send Discord would refuse with "Missing Access". */
export function requirePostable(
	channel: GuildTextBasedChannel,
	language: BotLanguage,
	also: readonly PermissionResolvable[] = [],
): void {
	const missing = missingToPost(channel, also);
	if (missing.length > 0) {
		throw new UserFacingError(
			say(language, "iNeedIn", { channel: channel.toString(), permissions: permissionList(language, missing) }),
		);
	}
}

/** Discord hides a channel from whoever cannot view it; a bot owner, who need not be a member, is `undefined` here. */
export function readerSees(channel: GuildBasedChannel, reader: GuildMember | undefined): boolean {
	return reader === undefined || channel.permissionsFor(reader).has(PermissionFlagsBits.ViewChannel);
}
