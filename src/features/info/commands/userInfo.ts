import { ButtonStyle } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { encodeId, Namespace } from "../../../core/customId";
import { button, row } from "../../../ui/components";
import { userInfoEmbed } from "../services/userCards";

export default defineCommand({
	name: "user-info",
	description: "Shows information about a user.",
	category: Category.Info,
	surfaces: ["slash", "prefix"],
	aliases: ["userinfo", "whois"],
	options: [{ name: "user", description: "The user to look up. Defaults to you.", type: "user" }],

	async execute(ctx) {
		const target = ctx.options.getUser("user") ?? ctx.user;
		const member = ctx.guild ? await ctx.guild.members.fetch(target.id).catch(() => null) : null;

		await ctx.reply({
			embeds: [userInfoEmbed(target, member)],
			components: [
				row(
					button({
						id: encodeId(Namespace.UserInfo, "info", target.id, ctx.user.id),
						label: "User info",
						style: ButtonStyle.Primary,
						disabled: true,
					}),
					button({
						id: encodeId(Namespace.UserInfo, "avatar", target.id, ctx.user.id),
						label: "Avatar",
						style: ButtonStyle.Secondary,
					}),
					button({
						id: encodeId(Namespace.UserInfo, "banner", target.id, ctx.user.id),
						label: "Banner",
						style: ButtonStyle.Secondary,
					}),
				),
			],
		});
	},
});
