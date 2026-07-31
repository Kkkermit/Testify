import { randomInt } from "node:crypto";
import { balancesOf } from "@buttons/shop";
import { defineButton } from "@core/button";
import { requireAccount } from "@database/repositories/economyRepository";
import { BALANCE_PANEL_ID, balancePanel } from "@lib/balancePanel.util";
import { dailyReady, useItem } from "@lib/economyActions.util";
import { INVENTORY_PANEL_ID, inventoryScreen } from "@lib/inventoryScreen.util";
import { shopScreen } from "@lib/shopScreen.util";

/** Using an item, and moving between the economy panels. */
export default defineButton({
	id: INVENTORY_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		if (!interaction.isButton()) return;

		const guildId = interaction.guild.id;
		const userId = interaction.user.id;
		const username = interaction.user.username;

		switch (context.action) {
			case "use": {
				const [itemId = "", rawPage = "0"] = context.args;
				const result = await useItem(guildId, userId, itemId, (min, max) => randomInt(min, max + 1));
				const updated = await requireAccount(guildId, userId);

				await interaction.update(
					inventoryScreen(updated, username, userId, Number.parseInt(rawPage, 10) || 0, result.message),
				);
				return;
			}

			case "page": {
				const [rawPage = "0"] = context.args;
				const account = await requireAccount(guildId, userId);

				await interaction.update(inventoryScreen(account, username, userId, Number.parseInt(rawPage, 10) || 0));
				return;
			}

			case "shop": {
				const account = await requireAccount(guildId, userId);
				await interaction.update(shopScreen({ section: "items" }, balancesOf(account), userId));
				return;
			}

			case "bal": {
				const account = await requireAccount(guildId, userId);
				await interaction.update(
					balancePanel(
						{
							wallet: account.wallet,
							bank: account.bank,
							username,
							avatarUrl: interaction.user.displayAvatarURL(),
							own: true,
							dailyReady: dailyReady(account.lastDaily),
						},
						userId,
					),
				);
				return;
			}

			default:
				return;
		}
	},
});

export { BALANCE_PANEL_ID };
