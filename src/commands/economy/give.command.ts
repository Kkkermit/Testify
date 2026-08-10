import { PermissionFlagsBits } from "discord.js";
import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { adjustBank, adjustWallet } from "@database/repositories/economyRepository";
import { addXp } from "@database/repositories/levelRepository";
import { successEmbed } from "@lib/embeds.util";
import { formatNumber } from "@lib/format.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "give",
	description: "Grants currency or XP to a member.",
	category: "economy",
	guildOnly: true,
	permissions: [PermissionFlagsBits.Administrator],
	subcommands: [
		{
			name: "currency",
			description: "Add money to a member's balance.",
			options: [
				{ name: "user", description: "Who to give money to.", type: "user", required: true },
				{ name: "amount", description: "How much to give.", type: "integer", required: true, min: 1 },
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);
				const amount = interaction.options.getInteger("amount", true);

				if (target.bot) throw new UserFacingError(strings.economy.botTarget);
				if (amount <= 0) throw new UserFacingError(strings.economy.amountPositive);

				const destination = interaction.options.getString("destination") ?? "wallet";
				const updated =
					destination === "bank"
						? await adjustBank(guild.id, target.id, amount)
						: await adjustWallet(guild.id, target.id, amount);

				await reply(interaction, {
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
				{ name: "amount", description: "How much XP to give.", type: "integer", required: true, min: 1 },
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);
				const amount = interaction.options.getInteger("amount", true);

				if (target.bot) throw new UserFacingError(strings.economy.botTarget);

				const updated = await addXp(guild.id, target.id, amount);
				await reply(interaction, {
					embeds: [
						successEmbed(`Gave **${formatNumber(amount)}** XP to ${target}. They are now level **${updated.level}**.`),
					],
				});
			},
		},
	],
});
