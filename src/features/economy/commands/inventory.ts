import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { requireGuild } from "../../../core/guards";
import { requireAccount } from "../../../database/repositories/economyRepository";
import { Namespace } from "../../../core/customId";
import { embed } from "../../../ui/embeds";
import { buildPage } from "../../../ui/pagination";
import { formatNumber } from "../../../ui/format";
import { findShopItem } from "../data/shop";

export const INVENTORY_PAGE_SIZE = 8;

export default defineCommand({
	name: "inventory",
	description: "Shows what you own.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	aliases: ["inv", "items"],
	guildOnly: true,
	options: [{ name: "user", description: "Whose inventory to view. Defaults to you.", type: "user" }],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const target = ctx.options.getUser("user") ?? ctx.user;
		const account = await requireAccount(guild.id, target.id);

		if (account.inventory.length === 0) {
			await ctx.reply({
				embeds: [
					embed({
						category: Category.Economy,
						title: `${target.username}'s inventory`,
						description: "Nothing here yet. Buy something with `/shop`.",
					}),
				],
			});
			return;
		}

		const page = buildPage(
			{
				items: [...account.inventory],
				pageSize: INVENTORY_PAGE_SIZE,
				namespace: Namespace.Inventory,
				ownerId: ctx.user.id,
				key: target.id,
				render: (items) =>
					embed({
						category: Category.Economy,
						title: `${target.username}'s inventory`,
						fields: items.map((item) => {
							const definition = findShopItem(item.itemId);
							return {
								name: `${item.emoji} ${item.name} \u00d7${formatNumber(item.quantity)}`,
								value: definition?.description ?? "\u200b",
								inline: false,
							};
						}),
					}),
			},
			0,
		);

		await ctx.reply(page);
	},
});
