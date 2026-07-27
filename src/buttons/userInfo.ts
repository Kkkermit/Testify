import { ButtonStyle } from "discord.js";
import { customId, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { button, row } from "@lib/components";
import { avatarEmbed, bannerEmbed, userInfoEmbed } from "@lib/userCards";

/**
 * One handler for the whole `userinfo` namespace. The previous version had three
 * separate `interactionCreate` listeners doing prefix matching on raw custom IDs.
 */
export default defineButton({
	id: "userinfo",
	ownerOnly: true,

	async run(interaction, context) {
		if (!interaction.isButton()) return;

		const [targetId, ownerId = interaction.user.id] = context.args;
		if (targetId === undefined) throw new UserFacingError("That button is no longer valid.");

		const target = await context.client.users.fetch(targetId).catch(() => null);
		if (!target) throw new UserFacingError("I could not find that user any more.");

		const member = interaction.guild ? await interaction.guild.members.fetch(targetId).catch(() => null) : null;

		const controls = row(
			button({
				id: customId("userinfo", "avatar", targetId, ownerId),
				label: "Avatar",
				style: ButtonStyle.Primary,
				disabled: context.action === "avatar",
			}),
			button({
				id: customId("userinfo", "banner", targetId, ownerId),
				label: "Banner",
				style: ButtonStyle.Secondary,
				disabled: context.action === "banner",
			}),
			button({
				id: customId("userinfo", "info", targetId, ownerId),
				label: "User info",
				style: ButtonStyle.Secondary,
				disabled: context.action === "info",
			}),
		);

		const embeds =
			context.action === "banner"
				? [await bannerEmbed(target)]
				: context.action === "info"
					? [userInfoEmbed(target, member)]
					: [avatarEmbed(target)];

		await interaction.update({ embeds, components: [controls] });
	},
});
