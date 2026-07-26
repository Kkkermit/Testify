import { Category } from "../../../config/categories";
import { ECONOMY } from "../../../config/constants";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { requireAccount, transfer } from "../../../database/repositories/economyRepository";
import { successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import { resolveAmount } from "../services/amount";

export default defineCommand({
	name: "transfer",
	description: "Sends money from your wallet to someone else.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	aliases: ["pay", "send"],
	guildOnly: true,
	cooldownMs: 5_000,
	options: [
		{ name: "user", description: "Who to pay.", type: "user", required: true },
		{ name: "amount", description: "An amount, or `all`.", type: "string", required: true },
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const target = ctx.options.getUser("user", true);

		if (target.id === ctx.user.id) throw new UserFacingError(strings.economy.selfTarget);
		if (target.bot) throw new UserFacingError(strings.economy.botTarget);

		const account = await requireAccount(guild.id, ctx.user.id);
		const amount = resolveAmount(ctx.options.getString("amount", true), account.wallet);
		if (amount < ECONOMY.transferMin) throw new UserFacingError(strings.economy.amountPositive);

		const moved = await transfer(guild.id, ctx.user.id, target.id, amount);
		if (!moved) throw new UserFacingError(strings.economy.insufficientWallet(amount - account.wallet));

		await ctx.reply({ embeds: [successEmbed(`Sent **${formatNumber(amount)}** to ${target}.`)] });
	},
});
