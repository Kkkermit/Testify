import { PermissionFlagsBits } from "discord.js";
import { strings } from "../../config/strings";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { containsProfanity } from "../../lib/contentFilter";
import { successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "nickname",
	description: "Changes or clears a member's nickname.",
	category: "moderation",
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
		},
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user", true);
		const nickname = interaction.options.getString("nickname");

		if (nickname !== null && containsProfanity(nickname)) throw new UserFacingError(strings.generic.profanity);

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (!member) throw new UserFacingError(strings.moderation.memberNotFound);
		if (!member.manageable) throw new UserFacingError(strings.moderation.notModeratable);

		await member.setNickname(nickname, `Changed by ${interaction.user.username}`);

		await reply(interaction, {
			embeds: [
				successEmbed(
					nickname === null ? `Cleared ${target}'s nickname.` : `${target}'s nickname is now **${nickname}**.`,
				),
			],
		});
	},
});
