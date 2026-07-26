import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { adjustBank, adjustWallet } from "../../../database/repositories/economyRepository";
import { addXp } from "../../../database/repositories/levelRepository";
import { successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";

/**
 * This wrote through a second, ten-field Mongoose model that shared the economy
 * collection, which could strip inventory, pets, houses and streaks off any
 * document it touched. There is now one model and one repository.
 */
export default defineCommand({
	name: "give",
	description: "Grants currency or XP to a member.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.Administrator],
	subcommands: [
		{
			name: "currency",
			description: "Add money to a member's balance.",
			options: [
				{ name: "user", description: "Who to give money to.", type: "user", required: true },
				{ name: "amount", description: "How much to give.", type: "integer", required: true, minValue: 1 },
				{
					name: "destination",
					description: "Wallet or bank.",
					type: "string",
					choices: [
						{ name: "wallet", value: "wallet" },
						{ name: "bank", value: "bank" },
					],
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);
				const amount = ctx.options.getInteger("amount", true);

				if (target.bot) throw new UserFacingError(strings.economy.botTarget);
				if (amount <= 0) throw new UserFacingError(strings.economy.amountPositive);

				const destination = ctx.options.getString("destination") ?? "wallet";
				const updated =
					destination === "bank"
						? await adjustBank(guild.id, target.id, amount)
						: await adjustWallet(guild.id, target.id, amount);

				await ctx.reply({
					embeds: [
						successEmbed(
							`Gave **${formatNumber(amount)}** to ${target}'s ${destination}.\nNew balance: **${formatNumber(updated.wallet + updated.bank)}**.`,
						),
					],
				});
			},
		},
		{
			name: "xp",
			description: "Add XP to a member.",
			options: [
				{ name: "user", description: "Who to give XP to.", type: "user", required: true },
				{ name: "amount", description: "How much XP to give.", type: "integer", required: true, minValue: 1 },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);
				const amount = ctx.options.getInteger("amount", true);

				if (target.bot) throw new UserFacingError(strings.economy.botTarget);

				const updated = await addXp(guild.id, target.id, amount);
				await ctx.reply({
					embeds: [
						successEmbed(`Gave **${formatNumber(amount)}** XP to ${target}. They are now level **${updated.level}**.`),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `currency` or `xp`.", ephemeral: true });
	},
});
