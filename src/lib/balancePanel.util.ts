import { ButtonStyle } from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { button, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	sectionWithThumbnail,
	text,
} from "@lib/containers.util";
import { formatNumber } from "@lib/format.util";

/** The wallet, and the things you would do next. */

export const BALANCE_PANEL_ID = "balance";

export interface BalanceView {
	wallet: number;
	bank: number;
	username: string;
	avatarUrl: string;
	/** False when looking someone else up, which hides the action buttons. */
	own: boolean;
	/** Shown as a banner after an action, rather than as a second message. */
	note?: string;
	/** Greys out Daily when it has already been claimed today. */
	dailyReady?: boolean;
}

export function balancePanel(view: BalanceView, ownerId: string): ContainerMessage {
	const total = view.wallet + view.bank;

	const body =
		`## ${view.username}'s balance\n` +
		`${theme.emoji.wallet} **Wallet** ${formatNumber(view.wallet)}\n` +
		`${theme.emoji.bank} **Bank** ${formatNumber(view.bank)}\n` +
		`${theme.emoji.coin} **Total** ${formatNumber(total)}`;

	const parts: ContainerPart[] = [
		view.note !== undefined ? text(`✅ ${view.note}`) : undefined,
		view.note !== undefined ? divider() : undefined,
		sectionWithThumbnail(body, view.avatarUrl, `${view.username}'s avatar`),
	].filter((part) => part !== undefined);

	if (!view.own) return containerMessage(container({ category: "economy", parts }));

	return containerMessage(
		container({
			category: "economy",
			parts: [
				...parts,
				divider(),
				row(
					button({
						id: customId(BALANCE_PANEL_ID, "dep", ownerId),
						label: "Deposit",
						emoji: theme.emoji.bank,
						disabled: view.wallet <= 0,
					}),
					button({
						id: customId(BALANCE_PANEL_ID, "wit", ownerId),
						label: "Withdraw",
						emoji: theme.emoji.wallet,
						disabled: view.bank <= 0,
					}),
					button({
						id: customId(BALANCE_PANEL_ID, "daily", ownerId),
						label: "Daily",
						style: ButtonStyle.Success,
						disabled: view.dailyReady === false,
					}),
				),
				row(
					button({ id: customId(BALANCE_PANEL_ID, "shop", ownerId), label: "Shop", emoji: "🛒" }),
					button({ id: customId(BALANCE_PANEL_ID, "inv", ownerId), label: "Inventory", emoji: "🎒" }),
					button({ id: customId(BALANCE_PANEL_ID, "refresh", ownerId), label: "Refresh", emoji: "🔄" }),
				),
			],
		}),
	);
}
