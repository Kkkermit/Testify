import { type Guild, type GuildMember, type GuildTextBasedChannel } from "discord.js";
import { strings } from "../config/strings";
import { type CommandContext } from "./context";
import { UserFacingError } from "./errors";

/**
 * Narrowing helpers. `guildOnly: true` already stops a command reaching DMs, but
 * the compiler cannot see that, and an assertion operator would hide the one case
 * where the guarantee does not hold.
 */

export function requireGuild(ctx: CommandContext): Guild {
	if (!ctx.guild) throw new UserFacingError(strings.generic.guildOnly);
	return ctx.guild;
}

export function requireMember(ctx: CommandContext): GuildMember {
	if (!ctx.member) throw new UserFacingError(strings.generic.guildOnly);
	return ctx.member;
}

export function requireTextChannel(ctx: CommandContext): GuildTextBasedChannel {
	const channel = ctx.channel;
	if (!channel || !("guild" in channel)) throw new UserFacingError(strings.generic.guildOnly);
	return channel;
}

export function requireOption<T>(value: T | null | undefined, message: string): T {
	if (value === null || value === undefined) throw new UserFacingError(message);
	return value;
}
