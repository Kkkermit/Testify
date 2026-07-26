import { INVENTORY_PAGE_SIZE } from "../commands/economy/inventory";
import { type InventoryItem } from "../database/models/economy";
import { findAccount } from "../database/repositories/economyRepository";
import { embed } from "../lib/embeds";
import { formatNumber } from "../lib/format";
import { paginatedButton } from "../lib/pagination";
import { findShopItem } from "../lib/shop";

/**
 * Page state lives entirely in the custom ID, so the list is rebuilt on demand.
 * The previous paginator kept a module-scope map and scheduled a fresh five-minute
 * timeout on every button press.
 */
export default paginatedButton<InventoryItem>({
	id: "inventory",
	pageSize: INVENTORY_PAGE_SIZE,
	async resolve(key, context) {
		if (context.guildId === null) return [];
		const account = await findAccount(context.guildId, key);
		return account?.inventory ?? [];
	},
	render: (items) =>
		embed({
			category: "economy",
			title: "Inventory",
			fields: items.map((item) => ({
				name: `${item.emoji} ${item.name} \u00d7${formatNumber(item.quantity)}`,
				value: findShopItem(item.itemId)?.description ?? "\u200b",
				inline: false,
			})),
		}),
});
