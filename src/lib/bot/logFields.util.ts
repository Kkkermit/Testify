import { SnowflakeUtil, type User } from "discord.js";
import { discordTime, escapeMarkdown, truncate } from "@lib/format/format.util";

/** Who and where, written the same way in every log channel post; the log channel is usually in another server. */

export interface LoggedUser {
	id: string;
	username: string;
	displayName: string;
	avatarUrl: string;
	createdAt: number;
	bot: boolean;
}

export interface LoggedPlace {
	id: string;
	name: string | null;
}

export interface LoggedGuild extends LoggedPlace {
	iconUrl: string | null;
}

/** A copy that outlives the interaction, for a post that goes out a few seconds later. */
export function loggedUser(user: User): LoggedUser {
	return {
		id: user.id,
		username: user.username,
		displayName: user.globalName ?? user.username,
		avatarUrl: user.displayAvatarURL(),
		createdAt: Number(SnowflakeUtil.timestampFrom(user.id)),
		bot: user.bot,
	};
}

export function loggedGuild(guild: { id: string; name: string; iconURL(): string | null } | null): LoggedGuild | null {
	return guild === null ? null : { id: guild.id, name: guild.name, iconUrl: guild.iconURL() };
}

/** The embed author line: the name people see, then the account name. */
export function logAuthor(user: LoggedUser): { name: string; iconURL: string } {
	const name = user.displayName === user.username ? `@${user.username}` : `${user.displayName} (@${user.username})`;
	return { name: `${name}${user.bot ? " · bot" : ""}`, iconURL: user.avatarUrl };
}

// A mention renders as a name only where the reader's client knows the user, so the name is written out too.
export function loggedUserText(user: LoggedUser): string {
	return (
		`<@${user.id}>\n**@${escapeMarkdown(user.username)}**\n\`${user.id}\`\n` +
		`-# Account made ${discordTime(user.createdAt, "R")}`
	);
}

export function loggedGuildText(guild: LoggedPlace | null): string {
	return guild === null ? "Direct message" : `**${escapeMarkdown(guild.name ?? "Unknown")}**\n\`${guild.id}\``;
}

export function loggedChannelText(channel: LoggedPlace | null): string {
	if (channel === null) return "Direct message";
	return `${channel.name === null ? "Unknown channel" : `**#${escapeMarkdown(channel.name)}**`}\n\`${channel.id}\``;
}

/** One `name value` line per option, in the order the command declares them. */
export function loggedOptionsText(options: readonly { name: string; value: string | null }[]): string {
	return options
		.map(
			({ name, value }) =>
				`\`${name}\` ${value === null ? "*not logged*" : escapeMarkdown(truncate(value.replace(/\s+/g, " "), 200))}`,
		)
		.join("\n");
}

/** A place a channel may be of any kind, and some kinds have no name. */
export function loggedChannel(channel: { id: string } | null, fallbackId: string | null): LoggedPlace | null {
	if (channel !== null) {
		const name = "name" in channel && typeof channel.name === "string" ? channel.name : null;
		return { id: channel.id, name };
	}
	return fallbackId === null ? null : { id: fallbackId, name: null };
}
