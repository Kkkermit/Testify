import { strings } from "../../config/strings";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { requireAccount, withdraw } from "../../database/repositories/economyRepository";
import { resolveAmount } from "../../lib/amount";
import { successEmbed } from "../../lib/embeds";
import { formatNumber } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "withdraw",
	description: "Moves money from the bank into your wallet.",
	category: "economy",
	aliases: ["with"],
	guildOnly: true,
	options: [{ name: "amount", description: "An amount, or `all`.", type: "string", required: true }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const account = await requireAccount(guild.id, interaction.user.id);
		const amount = resolveAmount(interaction.options.getString("amount", true), account.bank);

		const updated = await withdraw(guild.id, interaction.user.id, amount);
		if (!updated) throw new UserFacingError(strings.economy.insufficientBank(amount - account.bank));

		await reply(interaction, {
			embeds: [
				successEmbed(
					`Withdrew **${formatNumber(amount)}**.\nWallet: **${formatNumber(updated.wallet)}** • Bank: **${formatNumber(updated.bank)}**`,
				),
			],
		});
	},
});
