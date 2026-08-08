import { type EmbedBuilder, type Guild, type GuildMember, type User } from "discord.js";
import { strings } from "@config/strings";
import { asMember, type CommandInput } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";

export const DEFAULT_REASON = "No reason provided";

/**
 * Why this moderator may not act on this target, in the words the refusal shows — or null when they may.
 *
 * Every surface asks the same question, so the answer lives here rather than in a command or a route handler.
 */
export function moderationProblem(moderator: GuildMember, target: GuildMember, botId?: string): string | null {
	const guild = target.guild;

	if (target.id === moderator.id) return strings.moderation.selfTarget;
	// The id is passed rather than read off `members.me`, which is null when the bot's own member is uncached.
	if (target.id === (botId ?? guild.members.me?.id)) return strings.moderation.botTarget;
	if (target.id === guild.ownerId) return "You cannot moderate the server owner.";

	if (moderator.id !== guild.ownerId && moderator.roles.highest.position <= target.roles.highest.position) {
		return strings.moderation.hierarchyUser;
	}

	const me = guild.members.me;
	if (me && me.roles.highest.position <= target.roles.highest.position) return strings.moderation.hierarchyBot;

	return null;
}

export function assertModeratable(ctx: CommandInput, target: GuildMember): void {
	const problem = moderationProblem(asMember(ctx), target, ctx.client.user?.id);
	if (problem !== null) throw new UserFacingError(problem);
}

/** Best-effort DM to the target. */
export async function notifyTarget(user: User, builder: EmbedBuilder): Promise<boolean> {
	try {
		await user.send({ embeds: [builder] });
		return true;
	} catch {
		return false;
	}
}

export function actionEmbed(options: {
	action: string;
	emoji: string;
	guild: Guild;
	target: User;
	moderator: User;
	reason: string;
	extra?: { name: string; value: string; inline?: boolean }[];
}): EmbedBuilder {
	return embed({
		category: "moderation",
		title: `${options.emoji} ${options.action}`,
		fields: [
			{ name: "User", value: `${options.target} (\`${options.target.id}\`)`, inline: true },
			{ name: "Moderator", value: `${options.moderator}`, inline: true },
			{ name: "Reason", value: options.reason },
			...(options.extra ?? []),
		],
		thumbnail: options.target.displayAvatarURL(),
		footer: options.guild.name,
	});
}

export function dmEmbed(options: {
	action: string;
	emoji: string;
	guild: Guild;
	moderator: User;
	reason: string;
	extra?: { name: string; value: string; inline?: boolean }[];
}): EmbedBuilder {
	return embed({
		category: "moderation",
		title: `${options.emoji} You were ${options.action}`,
		fields: [
			{ name: "Server", value: options.guild.name, inline: true },
			{ name: "Moderator", value: options.moderator.username, inline: true },
			{ name: "Reason", value: options.reason },
			...(options.extra ?? []),
		],
		footer: options.guild.name,
	});
}
