import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { type EconomyAccount } from "@database/models/economy.schema";
import { button, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	sectionWithButton,
	text,
} from "@lib/containers.util";
import { formatNumber } from "@lib/format.util";
import { findShopItem } from "@lib/shop.util";

/**
 * What you own, with the thing you would do to each item beside it.
 *
 * The old view was a paginated embed of fields, so using an item meant reading its
 * name and typing `/use <name>`. A usable item now carries its own Use button.
 */

export const INVENTORY_PANEL_ID = "inv";
export const INVENTORY_PAGE = 5;

export interface InventoryEntry {
	itemId: string;
	name: string;
	emoji: string;
	quantity: number;
}

/** Only items still held; a quantity of zero is a leftover row, not a possession. */
export function heldItems(account: EconomyAccount): InventoryEntry[] {
	return account.inventory
		.filter((item) => item.quantity > 0)
		.map((item) => ({ itemId: item.itemId, name: item.name, emoji: item.emoji, quantity: item.quantity }));
}

export function inventoryScreen(
	account: EconomyAccount,
	username: string,
	ownerId: string,
	page = 0,
	note?: string,
	/** False when looking at someone else, which drops every control. */
	own = true,
): ContainerMessage {
	const items = heldItems(account);
	const pages = Math.max(1, Math.ceil(items.length / INVENTORY_PAGE));
	const current = Math.min(Math.max(0, page), pages - 1);
	const shown = items.slice(current * INVENTORY_PAGE, current * INVENTORY_PAGE + INVENTORY_PAGE);

	const parts: ContainerPart[] = [
		text(
			`## 🎒 ${username}'s inventory\n` +
				(items.length === 0
					? "Nothing here yet — buy something from the shop."
					: `${items.length} kind${items.length === 1 ? "" : "s"} of item · Wallet **${formatNumber(account.wallet)}**`),
		),
		divider(),
	];

	if (note !== undefined) parts.push(text(`✅ ${note}`), divider());

	for (const item of shown) {
		const definition = findShopItem(item.itemId);
		const usable = definition?.usable === true;

		parts.push(
			sectionWithButton(
				`**${item.emoji} ${item.name}** ×${formatNumber(item.quantity)}\n` +
					`${definition?.description ?? "​"}${usable ? "" : "\n-# Cannot be used directly"}`,
				button({
					id: customId(INVENTORY_PANEL_ID, "use", item.itemId, current, ownerId),
					label: "Use",
					style: ButtonStyle.Success,
					// Someone else's items are never yours to spend.
					disabled: !usable || !own,
				}),
			),
		);
	}

	parts.push(divider());

	if (pages > 1) {
		parts.push(
			text(`-# Page ${current + 1} of ${pages}`),
			row(
				button({
					id: customId(INVENTORY_PANEL_ID, "page", String(current - 1), ownerId),
					label: "Previous",
					disabled: current <= 0,
				}),
				button({
					id: customId(INVENTORY_PANEL_ID, "page", String(current + 1), ownerId),
					label: "Next",
					disabled: current >= pages - 1,
				}),
			),
		);
	}

	if (own) {
		parts.push(
			row(
				button({ id: customId(INVENTORY_PANEL_ID, "shop", ownerId), label: "Shop", emoji: "🛒" }),
				button({ id: customId(INVENTORY_PANEL_ID, "bal", ownerId), label: "Balance", emoji: "💰" }),
			),
		);
	}

	return containerMessage(container({ category: "economy", parts }));
}
