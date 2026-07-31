import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { deposit, withdraw } from "@database/repositories/economyRepository";
import { modalForm, quickAmountRow, type RenderedScreen } from "@lib/components.util";
import { embed, successEmbed } from "@lib/embeds.util";
import { formatNumber } from "@lib/format.util";

/** Quick-amount buttons for moving money between wallet and bank. */

export const MONEY_PANEL_ID = "money";

export type MoneyAction = "dep" | "wit";

const LABELS: Record<MoneyAction, { title: string; source: string }> = {
	dep: { title: "Deposit", source: "wallet" },
	wit: { title: "Withdraw", source: "bank" },
};

/** The chooser shown when no amount was given. */
export function amountPanel(
	action: MoneyAction,
	balances: { wallet: number; bank: number },
	ownerId: string,
): RenderedScreen {
	const available = action === "dep" ? balances.wallet : balances.bank;

	return {
		embeds: [
			embed({
				category: "economy",
				title: `${LABELS[action].title}`,
				description:
					available > 0
						? `How much would you like to move from your ${LABELS[action].source}?`
						: `You have nothing in your ${LABELS[action].source} to move.`,
				fields: [
					{ name: "Wallet", value: formatNumber(balances.wallet), inline: true },
					{ name: "Bank", value: formatNumber(balances.bank), inline: true },
				],
			}),
		],
		components: [quickAmountRow(MONEY_PANEL_ID, action, available, ownerId, formatNumber)],
	};
}

function isMoneyAction(value: string): value is MoneyAction {
	return value === "dep" || value === "wit";
}

async function move(
	action: MoneyAction,
	guildId: string,
	userId: string,
	amount: number,
): Promise<{ wallet: number; bank: number }> {
	if (amount <= 0) throw new UserFacingError("That works out to nothing.");

	const updated = action === "dep" ? await deposit(guildId, userId, amount) : await withdraw(guildId, userId, amount);
	if (!updated) throw new UserFacingError(`You do not have ${formatNumber(amount)} in your ${LABELS[action].source}.`);

	return updated;
}

export default defineButton({
	id: MONEY_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		const guildId = interaction.guild.id;
		const userId = interaction.user.id;

		// `dep-custom` and `wit-custom` open the modal; `dep` and `wit` carry an amount.
		const [base] = context.action.split("-");
		if (base === undefined || !isMoneyAction(base)) return;

		if (interaction.isButton() && context.action.endsWith("-custom")) {
			await interaction.showModal(
				modalForm({
					id: MONEY_PANEL_ID,
					action: `${base}-save`,
					title: `${LABELS[base].title} an amount`,
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

		const updated = await move(base, guildId, userId, amount);
		const done = successEmbed(
			`${LABELS[base].title === "Deposit" ? "Deposited" : "Withdrew"} **${formatNumber(amount)}**.\n` +
				`Wallet: **${formatNumber(updated.wallet)}** • Bank: **${formatNumber(updated.bank)}**`,
		);

		// Mutates the panel rather than posting another message under it.
		if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
			await interaction.reply({ embeds: [done], flags: 64 });
			return;
		}

		await interaction.update({ embeds: [done], components: [] });
	},
});
