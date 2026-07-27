import { ECONOMY } from "@config/constants";
import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { requireAccount, transfer } from "@database/repositories/economyRepository";
import { resolveAmount } from "@lib/amount";
import { successEmbed } from "@lib/embeds";
import { formatNumber } from "@lib/format";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "transfer",
	description: "Sends money from your wallet to someone else.",
	category: "economy",
	guildOnly: true,
	cooldown: 5_000,
	options: [
		{ name: "user", description: "Who to pay.", type: "user", required: true },
		{ name: "amount", description: "An amount, or `all`.", type: "string", required: true },
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user", true);

		if (target.id === interaction.user.id) throw new UserFacingError(strings.economy.selfTarget);
		if (target.bot) throw new UserFacingError(strings.economy.botTarget);

		const account = await requireAccount(guild.id, interaction.user.id);
		const amount = resolveAmount(interaction.options.getString("amount", true), account.wallet);
		if (amount < ECONOMY.transferMin) throw new UserFacingError(strings.economy.amountPositive);

		const moved = await transfer(guild.id, interaction.user.id, target.id, amount);
		if (!moved) throw new UserFacingError(strings.economy.insufficientWallet(amount - account.wallet));

		await reply(interaction, { embeds: [successEmbed(`Sent **${formatNumber(amount)}** to ${target}.`)] });
	},
});
