import { StringSelectMenuOptionBuilder } from "discord.js";
import { categoryEmoji, categoryLabel, Category } from "../../../config/categories";
import { DEFAULT_PREFIX } from "../../../config/constants";
import { defineCommand } from "../../../core/command";
import { encodeId, Namespace } from "../../../core/customId";
import { NotFoundError } from "../../../core/errors";
import { getGuildSettings } from "../../../database/repositories/guildSettingsRepository";
import { select, selectRow } from "../../../ui/components";
import {
	categoryEmbed,
	commandEmbed,
	overviewEmbed,
	populatedCategories,
	resolveCategory,
} from "../services/helpPages";

export default defineCommand({
	name: "help",
	description: "Lists everything the bot can do.",
	category: Category.Help,
	surfaces: ["slash", "prefix"],
	aliases: ["commands", "h"],
	options: [{ name: "query", description: "A command or category name.", type: "string", autocomplete: true }],

	async execute(ctx) {
		const prefix = ctx.guild ? (await getGuildSettings(ctx.guild.id)).prefix : DEFAULT_PREFIX;
		const query = ctx.options.getString("query")?.toLowerCase().trim();

		if (query !== undefined && query.length > 0) {
			const command = ctx.client.resolveCommand(query);
			if (command) {
				await ctx.reply({ embeds: [commandEmbed(command, prefix)] });
				return;
			}

			const category = resolveCategory(query);
			if (category) {
				await ctx.reply({ embeds: [categoryEmbed(ctx.client, category, prefix)] });
				return;
			}

			throw new NotFoundError(`Nothing matches \`${query}\`. Run \`/help\` with no arguments to browse.`);
		}

		// The selected category is carried in the custom ID, so two people running
		// /help at once cannot overwrite each other's page.
		const menu = select({
			id: encodeId(Namespace.Help, "category", ctx.user.id),
			placeholder: "Pick a category",
			options: populatedCategories(ctx.client).map((category) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(categoryLabel[category])
					.setValue(category)
					.setEmoji(categoryEmoji[category]),
			),
		});

		await ctx.reply({ embeds: [overviewEmbed(ctx.client, prefix)], components: [selectRow(menu)] });
	},

	async autocomplete(interaction, client) {
		const query = interaction.options.getFocused().toLowerCase();
		const names = [...client.commands.keys()].filter((name) => name.includes(query)).slice(0, 25);
		await interaction.respond(names.map((name) => ({ name, value: name })));
	},
});
