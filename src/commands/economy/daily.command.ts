import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { requireAccount } from "@database/repositories/economyRepository";
import { balancePanel } from "@lib/balancePanel.util";
import { claimDaily, dailyReady } from "@lib/economyActions.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "daily",
	description: "Claims your daily reward.",
	category: "economy",
	guildOnly: true,

	async run(interaction) {
		const guild = inGuild(interaction);
		const result = await claimDaily(guild.id, interaction.user.id);
		if (!result.claimed) throw new UserFacingError(result.message);

		// Lands on the balance panel so the new total and the next action are both
		// right there, rather than a dead-end confirmation embed.
		const account = await requireAccount(guild.id, interaction.user.id);
		await reply(
			interaction,
			balancePanel(
				{
					wallet: account.wallet,
					bank: account.bank,
					username: interaction.user.username,
					avatarUrl: interaction.user.displayAvatarURL(),
					own: true,
					dailyReady: dailyReady(account.lastDaily),
					note: result.message,
				},
				interaction.user.id,
			),
		);
	},
});
