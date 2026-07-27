import { defineCommand, inGuild } from "@core/command";
import { requireAccount } from "@database/repositories/economyRepository";
import { embed } from "@lib/embeds.util";
import { formatNumber } from "@lib/format.util";
import { buildPage } from "@lib/pagination.util";
import { reply } from "@lib/reply.util";
import { findShopItem } from "@lib/shop.util";

export const INVENTORY_PAGE_SIZE = 8;

export default defineCommand({
	name: "inventory",
	description: "Shows what you own.",
	category: "economy",
	aliases: ["inv"],
	guildOnly: true,
	options: [{ name: "user", description: "Whose inventory to view. Defaults to you.", type: "user" }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user") ?? interaction.user;
		const account = await requireAccount(guild.id, target.id);

		if (account.inventory.length === 0) {
			await reply(interaction, {
				embeds: [
					embed({
						category: "economy",
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
				id: "inventory",
				ownerId: interaction.user.id,
				key: target.id,
				render: (items) =>
					embed({
						category: "economy",
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

		await reply(interaction, page);
	},
});
