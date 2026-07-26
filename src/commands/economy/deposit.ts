import { strings } from "../../config/strings";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { deposit, requireAccount } from "../../database/repositories/economyRepository";
import { resolveAmount } from "../../lib/amount";
import { successEmbed } from "../../lib/embeds";
import { formatNumber } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "deposit",
	description: "Moves money from your wallet into the bank.",
	category: "economy",
	guildOnly: true,
	options: [{ name: "amount", description: "An amount, or `all`.", type: "string", required: true }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const account = await requireAccount(guild.id, interaction.user.id);
		const amount = resolveAmount(interaction.options.getString("amount", true), account.wallet);

		const updated = await deposit(guild.id, interaction.user.id, amount);
		if (!updated) throw new UserFacingError(strings.economy.insufficientWallet(amount - account.wallet));

		await reply(interaction, {
			embeds: [
				successEmbed(
					`Deposited **${formatNumber(amount)}**.\nWallet: **${formatNumber(updated.wallet)}** • Bank: **${formatNumber(updated.bank)}**`,
				),
			],
		});
	},
});
