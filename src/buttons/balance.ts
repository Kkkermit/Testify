import { amountPanel, MONEY_PANEL_ID } from "@buttons/money";
import { balancesOf } from "@buttons/shop";
import { defineButton } from "@core/button";
import { requireAccount } from "@database/repositories/economyRepository";
import { BALANCE_PANEL_ID, balancePanel } from "@lib/balancePanel.util";
import { claimDaily, dailyReady } from "@lib/economyActions.util";
import { inventoryScreen } from "@lib/inventoryScreen.util";
import { shopScreen } from "@lib/shopScreen.util";

/**
 * The quick actions on the balance panel.
 *
 * Each branch re-reads the account rather than trusting what the message was
 * rendered with, so a balance that changed elsewhere cannot be spent twice.
 */
export default defineButton({
	id: BALANCE_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		if (!interaction.isButton()) return;

		const guildId = interaction.guild.id;
		const userId = interaction.user.id;
		const account = await requireAccount(guildId, userId);

		const view = (note?: string) => ({
			wallet: account.wallet,
			bank: account.bank,
			username: interaction.user.username,
			avatarUrl: interaction.user.displayAvatarURL(),
			own: true,
			dailyReady: dailyReady(account.lastDaily),
			...(note !== undefined ? { note } : {}),
		});

		switch (context.action) {
			case "daily": {
				const result = await claimDaily(guildId, userId);
				const updated = await requireAccount(guildId, userId);

				await interaction.update(
					balancePanel(
						{
							wallet: updated.wallet,
							bank: updated.bank,
							username: interaction.user.username,
							avatarUrl: interaction.user.displayAvatarURL(),
							own: true,
							dailyReady: dailyReady(updated.lastDaily),
							note: result.message,
						},
						userId,
					),
				);
				return;
			}

			case "shop":
				await interaction.update(shopScreen({ section: "items" }, balancesOf(account), userId));
				return;

			case "inv":
				await interaction.update(inventoryScreen(account, interaction.user.username, userId));
				return;

			case "refresh":
				await interaction.update(balancePanel(view(), userId));
				return;

			// Hands off to the existing quick-amount chooser, which already knows how
			// to move money and validate the figure.
			case "dep":
			case "wit": {
				const panel = amountPanel(context.action === "dep" ? "dep" : "wit", account, userId);
				await interaction.update({ embeds: panel.embeds, components: panel.components });
				return;
			}

			default:
				return;
		}
	},
});

export { MONEY_PANEL_ID };
