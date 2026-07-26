import { ButtonStyle } from "discord.js";
import { customId } from "../../core/button";
import { defineCommand } from "../../core/command";
import { button, row } from "../../lib/components";
import { reply } from "../../lib/reply";
import { userInfoEmbed } from "../../lib/userCards";

export default defineCommand({
	name: "user-info",
	description: "Shows information about a user.",
	category: "info",
	options: [{ name: "user", description: "The user to look up. Defaults to you.", type: "user" }],

	async run(interaction) {
		const target = interaction.options.getUser("user") ?? interaction.user;
		const member = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;

		await reply(interaction, {
			embeds: [userInfoEmbed(target, member)],
			components: [
				row(
					button({
						id: customId("userinfo", "info", target.id, interaction.user.id),
						label: "User info",
						style: ButtonStyle.Primary,
						disabled: true,
					}),
					button({
						id: customId("userinfo", "avatar", target.id, interaction.user.id),
						label: "Avatar",
						style: ButtonStyle.Secondary,
					}),
					button({
						id: customId("userinfo", "banner", target.id, interaction.user.id),
						label: "Banner",
						style: ButtonStyle.Secondary,
					}),
				),
			],
		});
	},
});
