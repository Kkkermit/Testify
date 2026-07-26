import { strings } from "../../config/strings";
import { theme } from "../../config/theme";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { findAccount } from "../../database/repositories/economyRepository";
import { embed } from "../../lib/embeds";
import { formatNumber } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "balance",
	description: "Shows a wallet and bank balance.",
	category: "economy",
	guildOnly: true,
	options: [{ name: "user", description: "Whose balance to check. Defaults to you.", type: "user" }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user") ?? interaction.user;

		if (target.bot) throw new UserFacingError(strings.economy.botTarget);

		const account = await findAccount(guild.id, target.id);
		if (!account) {
			throw new UserFacingError(
				target.id === interaction.user.id
					? strings.economy.noAccount
					: strings.economy.targetNoAccount(target.username),
			);
		}

		await reply(interaction, {
			embeds: [
				embed({
					category: "economy",
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
