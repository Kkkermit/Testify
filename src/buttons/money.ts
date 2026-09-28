import { MessageFlags } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { deposit, requireAccount, withdraw } from "@database/repositories/economyRepository";
import { modalForm } from "@lib/discord";
import {
	balancePanel,
	dailyReady,
	MONEY_PANEL_ID,
	type MoneyAction,
	moneyAction,
	moneyTitle,
	movedNote,
	movedPanel,
	parseMoneyAction,
} from "@lib/economy";
import { formatNumber } from "@lib/format";

/** Quick-amount buttons for moving money between wallet and bank. */

async function move(
	action: MoneyAction,
	guildId: string,
	userId: string,
	amount: number,
): Promise<{ wallet: number; bank: number }> {
	if (amount <= 0) throw new UserFacingError("That works out to nothing.");

	const updated = action === "dep" ? await deposit(guildId, userId, amount) : await withdraw(guildId, userId, amount);
	if (!updated) {
		throw new UserFacingError(
			`You do not have ${formatNumber(amount)} in your ${action === "dep" ? "wallet" : "bank"}.`,
		);
	}

	return updated;
}

export default defineButton({
	id: MONEY_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		const guildId = interaction.guild.id;
		const userId = interaction.user.id;

		const parsed = parseMoneyAction(context.action);
		if (parsed === null) return;
		const { action, origin } = parsed;

		if (interaction.isButton() && parsed.step === "custom") {
			await interaction.showModal(
				modalForm({
					id: MONEY_PANEL_ID,
					action: `${moneyAction(action, origin)}-save`,
					title: `${moneyTitle(action)} an amount`,
					fields: [{ id: "amount", label: "How much?", placeholder: "e.g. 250" }],
				}),
			);
			return;
		}

		const raw = interaction.isModalSubmit()
			? interaction.fields
					.getTextInputValue("amount")
					.trim()
					.replace(/[,_\s]/g, "")
			: (context.args[0] ?? "");

		const amount = Number(raw);
		if (!Number.isInteger(amount) || amount <= 0) {
			throw new UserFacingError("Enter a positive whole number.");
		}

		const updated = await move(action, guildId, userId, amount);

		if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
			await interaction.reply({
				...movedPanel(action, amount, updated),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			});
			return;
		}

		if (origin === "balance") {
			const account = await requireAccount(guildId, userId);
			await interaction.update(
				balancePanel(
					{
						wallet: account.wallet,
						bank: account.bank,
						username: interaction.user.username,
						avatarUrl: interaction.user.displayAvatarURL(),
						own: true,
						dailyReady: dailyReady(account.lastDaily),
						note: movedNote(action, amount),
					},
					userId,
				),
			);
			return;
		}

		await interaction.update(movedPanel(action, amount, updated));
	},
});
