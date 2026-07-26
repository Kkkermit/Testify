import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	addInventoryItem,
	adjustWallet,
	debitWallet,
	requireAccount,
	setFields,
} from "../../../database/repositories/economyRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import { BUSINESSES, findBusiness, findHouse, findShopItem, HOUSES, SHOP_ITEMS } from "../data/shop";

export default defineCommand({
	name: "shop",
	description: "Browses and buys from the shop.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	aliases: ["store"],
	guildOnly: true,
	subcommands: [
		{
			name: "view",
			description: "See everything for sale.",
			options: [
				{
					name: "section",
					description: "Which part of the shop.",
					type: "string",
					choices: [
						{ name: "items", value: "items" },
						{ name: "houses", value: "houses" },
						{ name: "businesses", value: "businesses" },
					],
				},
			],
			async execute(ctx) {
				const section = ctx.options.getString("section") ?? "items";

				const entries =
					section === "houses"
						? HOUSES.map((house) => ({
								name: `${house.emoji} ${house.name} \u2014 ${formatNumber(house.price)}`,
								value: `${house.description}\nPassive income: **${formatNumber(house.income)}/hour**\n\`${house.id}\``,
								inline: false,
							}))
						: section === "businesses"
							? BUSINESSES.map((business) => ({
									name: `${business.emoji} ${business.name} \u2014 ${formatNumber(business.price)}`,
									value: `${business.description}\nPassive income: **${formatNumber(business.income)}/hour**\n\`${business.id}\``,
									inline: false,
								}))
							: SHOP_ITEMS.map((item) => ({
									name: `${item.emoji} ${item.name} \u2014 ${formatNumber(item.price)}`,
									value: `${item.description}\n\`${item.id}\``,
									inline: false,
								}));

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Economy,
							title: `Shop \u2014 ${section}`,
							description: "Buy with `/shop buy <id>`.",
							fields: entries,
						}),
					],
				});
			},
		},
		{
			name: "buy",
			description: "Buy something from the shop.",
			options: [
				{ name: "id", description: "The item, house or business id.", type: "string", required: true },
				{ name: "quantity", description: "How many to buy.", type: "integer", minValue: 1, maxValue: 100 },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const id = ctx.options.getString("id", true).toLowerCase().replace(/\s+/g, "_");
				const quantity = ctx.options.getInteger("quantity") ?? 1;
				const account = await requireAccount(guild.id, ctx.user.id);

				const item = findShopItem(id);
				if (item) {
					const cost = item.price * quantity;
					const paid = await debitWallet(guild.id, ctx.user.id, cost);
					if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(cost - account.wallet));

					await addInventoryItem(guild.id, ctx.user.id, {
						itemId: item.id,
						name: item.name,
						emoji: item.emoji,
						quantity,
					});

					await ctx.reply({
						embeds: [
							successEmbed(`Bought ${item.emoji} **${item.name}** \u00d7${quantity} for **${formatNumber(cost)}**.`),
						],
					});
					return;
				}

				const house = findHouse(id);
				if (house) {
					if (account.house !== null) throw new UserFacingError("You already own a house. Sell it first.");

					const paid = await debitWallet(guild.id, ctx.user.id, house.price);
					if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(house.price - account.wallet));

					await setFields(guild.id, ctx.user.id, {
						house: {
							houseId: house.id,
							name: house.name,
							emoji: house.emoji,
							value: house.price,
							purchasedAt: new Date(),
						},
					});

					await ctx.reply({ embeds: [successEmbed(`You bought ${house.emoji} **${house.name}**.`)] });
					return;
				}

				const business = findBusiness(id);
				if (business) {
					if (account.businesses.some((owned) => owned.businessId === business.id)) {
						throw new UserFacingError("You already own that business.");
					}

					const paid = await debitWallet(guild.id, ctx.user.id, business.price);
					if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(business.price - account.wallet));

					await setFields(guild.id, ctx.user.id, {
						businesses: [
							...account.businesses,
							{
								businessId: business.id,
								name: business.name,
								emoji: business.emoji,
								level: 1,
								income: business.income,
								purchasedAt: new Date(),
								lastCollected: null,
							},
						],
					});

					await ctx.reply({ embeds: [successEmbed(`You bought ${business.emoji} **${business.name}**.`)] });
					return;
				}

				throw new UserFacingError(`Nothing in the shop has the id \`${id}\`. Use \`/shop view\` to browse.`);
			},
		},
		{
			name: "sell",
			description: "Sell your house back for half its value.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const account = await requireAccount(guild.id, ctx.user.id);
				if (account.house === null) throw new UserFacingError("You do not own a house.");

				const refund = Math.floor(account.house.value / 2);
				await setFields(guild.id, ctx.user.id, { house: null });
				await adjustWallet(guild.id, ctx.user.id, refund);

				await ctx.reply({
					embeds: [successEmbed(`Sold **${account.house.name}** for **${formatNumber(refund)}**.`)],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `view`, `buy` or `sell`.", ephemeral: true });
	},
});
