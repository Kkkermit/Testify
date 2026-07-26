import { ButtonStyle } from "discord.js";
import { defineComponent } from "../../../core/component";
import { encodeId, Namespace } from "../../../core/customId";
import { NotFoundError } from "../../../core/errors";
import { button, row } from "../../../ui/components";
import { avatarEmbed, bannerEmbed, userInfoEmbed } from "../services/userCards";

/**
 * One handler for the whole `userinfo` namespace. The previous version had three
 * separate `interactionCreate` listeners doing prefix matching on raw custom IDs.
 */
export default defineComponent({
	namespace: Namespace.UserInfo,
	ownerOnly: true,

	async handle(ctx) {
		if (!ctx.interaction.isButton()) return;

		const [targetId, ownerId = ctx.interaction.user.id] = ctx.args;
		if (targetId === undefined) throw new NotFoundError("That button is no longer valid.");

		const target = await ctx.client.users.fetch(targetId).catch(() => null);
		if (!target) throw new NotFoundError("I could not find that user any more.");

		const member = ctx.interaction.guild ? await ctx.interaction.guild.members.fetch(targetId).catch(() => null) : null;

		const controls = row(
			button({
				id: encodeId(Namespace.UserInfo, "avatar", targetId, ownerId),
				label: "Avatar",
				style: ButtonStyle.Primary,
				disabled: ctx.action === "avatar",
			}),
			button({
				id: encodeId(Namespace.UserInfo, "banner", targetId, ownerId),
				label: "Banner",
				style: ButtonStyle.Secondary,
				disabled: ctx.action === "banner",
			}),
			button({
				id: encodeId(Namespace.UserInfo, "info", targetId, ownerId),
				label: "User info",
				style: ButtonStyle.Secondary,
				disabled: ctx.action === "info",
			}),
		);

		const embeds =
			ctx.action === "banner"
				? [await bannerEmbed(target)]
				: ctx.action === "info"
					? [userInfoEmbed(target, member)]
					: [avatarEmbed(target)];

		await ctx.interaction.update({ embeds, components: [controls] });
	},
});
