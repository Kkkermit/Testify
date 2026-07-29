import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { findAccount } from "@database/repositories/economyRepository";
import { balancePanel } from "@lib/balancePanel.util";
import { dailyReady } from "@lib/economyActions.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "balance",
	description: "Shows a wallet and bank balance.",
	category: "economy",
	aliases: ["bal", "money"],
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

		// Controls only on your own balance — you cannot spend someone else's.
		await reply(
			interaction,
			balancePanel(
				{
					wallet: account.wallet,
					bank: account.bank,
					username: target.username,
					avatarUrl: target.displayAvatarURL(),
					own: target.id === interaction.user.id,
					dailyReady: dailyReady(account.lastDaily),
				},
				interaction.user.id,
			),
		);
	},
});
