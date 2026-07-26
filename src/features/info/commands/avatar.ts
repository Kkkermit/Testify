import { ButtonStyle } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { encodeId, Namespace } from "../../../core/customId";
import { button, row } from "../../../ui/components";
import { avatarEmbed } from "../services/userCards";

export default defineCommand({
	name: "avatar",
	description: "Shows a user's avatar and banner.",
	category: Category.Info,
	surfaces: ["slash", "prefix"],
	aliases: ["av", "pfp"],
	options: [{ name: "user", description: "The user to look up. Defaults to you.", type: "user" }],

	async execute(ctx) {
		const target = ctx.options.getUser("user") ?? ctx.user;

		await ctx.reply({
			embeds: [avatarEmbed(target)],
			components: [
				row(
					button({
						id: encodeId(Namespace.UserInfo, "avatar", target.id, ctx.user.id),
						label: "Avatar",
						style: ButtonStyle.Primary,
						disabled: true,
					}),
					button({
						id: encodeId(Namespace.UserInfo, "banner", target.id, ctx.user.id),
						label: "Banner",
						style: ButtonStyle.Secondary,
					}),
					button({
						id: encodeId(Namespace.UserInfo, "info", target.id, ctx.user.id),
						label: "User info",
						style: ButtonStyle.Secondary,
					}),
				),
			],
		});
	},
});
