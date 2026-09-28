import { ButtonStyle } from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { button, quickAmountRow, row } from "@lib/discord/components.util";
import { container, containerMessage, divider, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { BALANCE_PANEL_ID, MONEY_PANEL_ID } from "@lib/economy/economy.constants";
import { type MoneyAction, type MoneyOrigin } from "@lib/economy/economy.types";
import { formatNumber } from "@lib/format/format.util";

/** Choosing how much to move between wallet and bank, as a V2 panel so it can replace the balance panel in place. */

const LABELS: Record<MoneyAction, { title: string; done: string; source: string; emoji: string }> = {
	dep: { title: "Deposit", done: "Deposited", source: "wallet", emoji: theme.emoji.bank },
	wit: { title: "Withdraw", done: "Withdrew", source: "bank", emoji: theme.emoji.wallet },
};

const FROM_BALANCE = "bal";

export interface MoneyStep {
	action: MoneyAction;
	origin: MoneyOrigin;
	/** An amount button, the button that opens the form, or the form being sent. */
	step: "amount" | "custom" | "save";
}

/** The action a chooser's buttons carry, so the answer knows where it was opened from. */
export function moneyAction(action: MoneyAction, origin: MoneyOrigin): string {
	return origin === "balance" ? `${action}-${FROM_BALANCE}` : action;
}

export function parseMoneyAction(raw: string): MoneyStep | null {
	const parts = raw.split("-");
	const [action] = parts;
	if (action !== "dep" && action !== "wit") return null;

	const last = parts.at(-1);
	return {
		action,
		origin: parts.includes(FROM_BALANCE) ? "balance" : "command",
		step: last === "custom" || last === "save" ? last : "amount",
	};
}

export function moneyTitle(action: MoneyAction): string {
	return LABELS[action].title;
}

function balancesLine(balances: { wallet: number; bank: number }): string {
	return (
		`${theme.emoji.wallet} **Wallet** ${formatNumber(balances.wallet)}  ·  ` +
		`${theme.emoji.bank} **Bank** ${formatNumber(balances.bank)}`
	);
}

/** The chooser shown when no amount was given. */
export function amountPanel(
	action: MoneyAction,
	balances: { wallet: number; bank: number },
	ownerId: string,
	origin: MoneyOrigin = "command",
): ContainerMessage {
	const label = LABELS[action];
	const available = action === "dep" ? balances.wallet : balances.bank;

	const parts: ContainerPart[] = [
		text(
			`## ${label.emoji} ${label.title}\n` +
				(available > 0
					? `How much would you like to move from your ${label.source}?`
					: `You have nothing in your ${label.source} to move.`),
		),
		text(balancesLine(balances)),
		divider(),
		quickAmountRow(MONEY_PANEL_ID, moneyAction(action, origin), available, ownerId, formatNumber),
	];

	if (origin === "balance") {
		parts.push(
			row(
				button({
					id: customId(BALANCE_PANEL_ID, "refresh", ownerId),
					label: "Back",
					emoji: "⬅️",
					style: ButtonStyle.Secondary,
				}),
			),
		);
	}

	return containerMessage(container({ category: "economy", parts }));
}

/** What a move from `/deposit` or `/withdraw` ends on; one from the balance panel goes back to it instead. */
export function movedPanel(
	action: MoneyAction,
	amount: number,
	balances: { wallet: number; bank: number },
): ContainerMessage {
	return containerMessage(
		container({
			category: "economy",
			parts: [text(`## ✅ ${LABELS[action].done} ${formatNumber(amount)}`), text(balancesLine(balances))],
		}),
	);
}

export function movedNote(action: MoneyAction, amount: number): string {
	return `${LABELS[action].done} **${formatNumber(amount)}**.`;
}
