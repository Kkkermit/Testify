import {
	type ChatInputCommandInteraction,
	type EmbedBuilder,
	type Guild,
	type GuildMember,
	type User,
} from "discord.js";
import { strings } from "../config/strings";
import { asMember } from "../core/command";
import { UserFacingError } from "../core/errors";
import { embed } from "./embeds";

export const DEFAULT_REASON = "No reason provided";

/**
 * The hierarchy checks every moderation command needs, in one place. The previous
 * commands each wrote their own subset, and several skipped the bot-side check
 * entirely so the action failed with a raw API error.
 */
export function assertModeratable(ctx: ChatInputCommandInteraction, target: GuildMember): void {
	const moderator = asMember(ctx);
	const guild = target.guild;

	if (target.id === ctx.user.id) throw new UserFacingError(strings.moderation.selfTarget);
	if (target.id === ctx.client.user.id) throw new UserFacingError(strings.moderation.botTarget);
	if (target.id === guild.ownerId) throw new UserFacingError("You cannot moderate the server owner.");

	if (moderator.id !== guild.ownerId && moderator.roles.highest.position <= target.roles.highest.position) {
		throw new UserFacingError(strings.moderation.hierarchyUser);
	}

	const me = guild.members.me;
	if (me && me.roles.highest.position <= target.roles.highest.position) {
		throw new UserFacingError(strings.moderation.hierarchyBot);
	}
}

/** Best-effort DM to the target. Returns false when it could not be delivered. */
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
