import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { strings } from "../../../config/strings";
import { findAccount } from "../../../database/repositories/economyRepository";
import { embed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";

export default defineCommand({
	name: "balance",
	description: "Shows a wallet and bank balance.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	aliases: ["bal", "money"],
	guildOnly: true,
	options: [{ name: "user", description: "Whose balance to check. Defaults to you.", type: "user" }],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const target = ctx.options.getUser("user") ?? ctx.user;

		if (target.bot) throw new UserFacingError(strings.economy.botTarget);

		const account = await findAccount(guild.id, target.id);
		if (!account) {
			throw new UserFacingError(
				target.id === ctx.user.id ? strings.economy.noAccount : strings.economy.targetNoAccount(target.username),
			);
		}

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Economy,
					title: `${target.username}'s balance`,
					fields: [
						{ name: `${theme.emoji.wallet} Wallet`, value: formatNumber(account.wallet), inline: true },
						{ name: `${theme.emoji.bank} Bank`, value: formatNumber(account.bank), inline: true },
						{ name: `${theme.emoji.coin} Total`, value: formatNumber(account.wallet + account.bank), inline: true },
					],
					thumbnail: target.displayAvatarURL(),
				}),
			],
		});
	},
});
