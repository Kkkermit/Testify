import { Category } from "../../../config/categories";
import { Namespace } from "../../../core/customId";
import { findAccount } from "../../../database/repositories/economyRepository";
import { type InventoryItem } from "../../../database/models/economy";
import { embed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import { createPaginationHandler } from "../../../ui/pagination";
import { findShopItem } from "../data/shop";
import { INVENTORY_PAGE_SIZE } from "../commands/inventory";

/**
 * Page state lives entirely in the custom ID, so the list is rebuilt on demand.
 * The previous paginator kept a module-scope map and scheduled a fresh five-minute
 * timeout on every button press.
 */
export default createPaginationHandler<InventoryItem>({
	namespace: Namespace.Inventory,
	pageSize: INVENTORY_PAGE_SIZE,
	async resolve(key, context) {
		if (context.guildId === null) return [];
		const account = await findAccount(context.guildId, key);
		return account?.inventory ?? [];
	},
	render: (items) =>
		embed({
			category: Category.Economy,
			title: "Inventory",
			fields: items.map((item) => ({
				name: `${item.emoji} ${item.name} \u00d7${formatNumber(item.quantity)}`,
				value: findShopItem(item.itemId)?.description ?? "\u200b",
				inline: false,
			})),
		}),
});
