import { type EmbedBuilder, type Guild, type GuildMember, type User } from "discord.js";
import { strings } from "@config/strings";
import { asMember, type CommandInput } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/discord/embeds.util";
import { type MemberBlock } from "@testify/shared";

/** Why this moderator may not act on this target, as a code, or null; every surface asks here. */
export function moderationBlock(moderator: GuildMember, target: GuildMember, botId?: string): MemberBlock | null {
	const guild = target.guild;

	if (target.id === moderator.id) return "you";
	// The id is passed rather than read off `members.me`, which is null when the bot's own member is uncached.
	if (target.id === (botId ?? guild.members.me?.id)) return "bot";
	if (target.id === guild.ownerId) return "owner";

	if (moderator.id !== guild.ownerId && moderator.roles.highest.position <= target.roles.highest.position) {
		return "outranked";
	}

	const me = guild.members.me;
	if (me && me.roles.highest.position <= target.roles.highest.position) return "botOutranked";

	return null;
}

const BLOCK_TEXT: Record<MemberBlock, string> = {
	you: strings.moderation.selfTarget,
	bot: strings.moderation.botTarget,
	owner: "You cannot moderate the server owner.",
	outranked: strings.moderation.hierarchyUser,
	botOutranked: strings.moderation.hierarchyBot,
	notMember: "Only somebody in this server can moderate its members.",
};

export function blockText(block: MemberBlock): string {
	return BLOCK_TEXT[block];
}

export function moderationProblem(moderator: GuildMember, target: GuildMember, botId?: string): string | null {
	const block = moderationBlock(moderator, target, botId);
	return block === null ? null : BLOCK_TEXT[block];
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
	moderator: Pick<User, "username">;
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
