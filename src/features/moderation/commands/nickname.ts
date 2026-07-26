import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { containsProfanity } from "../../../core/contentFilter";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "nickname",
	description: "Changes or clears a member's nickname.",
	category: Category.Moderation,
	surfaces: ["slash", "prefix"],
	aliases: ["nick", "setnick"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageNicknames],
	botPermissions: [PermissionFlagsBits.ManageNicknames],
	options: [
		{ name: "user", description: "The member to rename.", type: "user", required: true },
		{
			name: "nickname",
			description: "The new nickname. Leave empty to clear it.",
			type: "string",
			maxLength: 32,
			greedy: true,
		},
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const target = ctx.options.getUser("user", true);
		const nickname = ctx.options.getString("nickname");

		if (nickname !== null && containsProfanity(nickname)) throw new UserFacingError(strings.generic.profanity);

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (!member) throw new UserFacingError(strings.moderation.memberNotFound);
		if (!member.manageable) throw new UserFacingError(strings.moderation.notModeratable);

		await member.setNickname(nickname, `Changed by ${ctx.user.username}`);

		await ctx.reply({
			embeds: [
				successEmbed(
					nickname === null ? `Cleared ${target}'s nickname.` : `${target}'s nickname is now **${nickname}**.`,
				),
			],
		});
	},
});
