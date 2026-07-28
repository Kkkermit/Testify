import { amountPanel } from "@buttons/money";
import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { requireAccount, withdraw } from "@database/repositories/economyRepository";
import { resolveAmount } from "@lib/amount.util";
import { successEmbed } from "@lib/embeds.util";
import { formatNumber } from "@lib/format.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "withdraw",
	description: "Moves money from the bank into your wallet.",
	category: "economy",
	aliases: ["with"],
	guildOnly: true,
	options: [{ name: "amount", description: "An amount, or `all`. Leave blank to pick from buttons.", type: "string" }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const account = await requireAccount(guild.id, interaction.user.id);
		const typed = interaction.options.getString("amount");

		// No amount given, so offer the quick-amount buttons rather than an error.
		if (typed === null) {
			await reply(interaction, amountPanel("wit", account, interaction.user.id));
			return;
		}

		const amount = resolveAmount(typed, account.bank);

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
