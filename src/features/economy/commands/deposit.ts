import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { deposit, requireAccount } from "../../../database/repositories/economyRepository";
import { successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import { resolveAmount } from "../services/amount";

export default defineCommand({
	name: "deposit",
	description: "Moves money from your wallet into the bank.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	aliases: ["dep"],
	guildOnly: true,
	options: [{ name: "amount", description: "An amount, or `all`.", type: "string", required: true }],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const account = await requireAccount(guild.id, ctx.user.id);
		const amount = resolveAmount(ctx.options.getString("amount", true), account.wallet);

		const updated = await deposit(guild.id, ctx.user.id, amount);
		if (!updated) throw new UserFacingError(strings.economy.insufficientWallet(amount - account.wallet));

		await ctx.reply({
			embeds: [
				successEmbed(
					`Deposited **${formatNumber(amount)}**.\nWallet: **${formatNumber(updated.wallet)}** • Bank: **${formatNumber(updated.bank)}**`,
				),
			],
		});
	},
});
