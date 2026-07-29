import { amountPanel } from "@buttons/money";
import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { deposit, requireAccount } from "@database/repositories/economyRepository";
import { resolveAmount } from "@lib/amount.util";
import { successEmbed } from "@lib/embeds.util";
import { formatNumber } from "@lib/format.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "deposit",
	description: "Moves money from your wallet into the bank.",
	category: "economy",
	aliases: ["dep"],
	guildOnly: true,
	options: [{ name: "amount", description: "An amount, or `all`. Leave blank to pick from buttons.", type: "string" }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const account = await requireAccount(guild.id, interaction.user.id);
		const typed = interaction.options.getString("amount");

		// No amount given, so offer the quick-amount buttons rather than an error.
		if (typed === null) {
			await reply(interaction, amountPanel("dep", account, interaction.user.id));
			return;
		}

		const amount = resolveAmount(typed, account.wallet);

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
