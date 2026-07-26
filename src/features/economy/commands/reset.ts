import { ButtonStyle, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { encodeId, Namespace } from "../../../core/customId";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { deleteAccount } from "../../../database/repositories/economyRepository";
import { button, row } from "../../../ui/components";
import { successEmbed, warningEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "reset",
	description: "Resets economy or level data.",
	category: Category.Economy,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.Administrator],
	subcommands: [
		{
			name: "user",
			description: "Wipe one member's economy account.",
			options: [{ name: "user", description: "Whose account to wipe.", type: "user", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);

				const deleted = await deleteAccount(guild.id, target.id);
				if (!deleted) throw new UserFacingError(`${target.username} does not have an account here.`);

				await ctx.reply({ embeds: [successEmbed(`Wiped ${target}'s economy account.`)] });
			},
		},
		{
			name: "server",
			description: "Wipe every economy account in this server.",
			async execute(ctx) {
				await ctx.reply({
					embeds: [
						warningEmbed("This will delete **every** economy account in this server. There is no undo. Confirm below."),
					],
					components: [
						row(
							button({
								id: encodeId(Namespace.Reset, "economy-yes", ctx.user.id),
								label: "Delete everything",
								style: ButtonStyle.Danger,
							}),
							button({
								id: encodeId(Namespace.Reset, "economy-no", ctx.user.id),
								label: "Cancel",
								style: ButtonStyle.Secondary,
							}),
						),
					],
					ephemeral: true,
				});
			},
		},
		{
			name: "levels",
			description: "Wipe every level in this server.",
			async execute(ctx) {
				await ctx.reply({
					embeds: [warningEmbed("This will reset **every** member's level in this server. Confirm below.")],
					components: [
						row(
							button({
								id: encodeId(Namespace.Reset, "levels-yes", ctx.user.id),
								label: "Reset all levels",
								style: ButtonStyle.Danger,
							}),
							button({
								id: encodeId(Namespace.Reset, "levels-no", ctx.user.id),
								label: "Cancel",
								style: ButtonStyle.Secondary,
							}),
						),
					],
					ephemeral: true,
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `user`, `server` or `levels`.", ephemeral: true });
	},
});
