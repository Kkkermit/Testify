import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { requireAccount, withdraw } from "../../../database/repositories/economyRepository";
import { successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import { resolveAmount } from "../services/amount";

export default defineCommand({
	name: "withdraw",
	description: "Moves money from the bank into your wallet.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	aliases: ["with"],
	guildOnly: true,
	options: [{ name: "amount", description: "An amount, or `all`.", type: "string", required: true }],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const account = await requireAccount(guild.id, ctx.user.id);
		const amount = resolveAmount(ctx.options.getString("amount", true), account.bank);

		const updated = await withdraw(guild.id, ctx.user.id, amount);
		if (!updated) throw new UserFacingError(strings.economy.insufficientBank(amount - account.bank));

		await ctx.reply({
			embeds: [
				successEmbed(
					`Withdrew **${formatNumber(amount)}**.\nWallet: **${formatNumber(updated.wallet)}** • Bank: **${formatNumber(updated.bank)}**`,
				),
			],
		});
	},
});
