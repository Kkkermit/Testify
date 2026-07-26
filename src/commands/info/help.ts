import { StringSelectMenuOptionBuilder } from "discord.js";
import { categoryEmoji, categoryLabel } from "../../config/categories";
import { customId } from "../../core/button";
import { defineCommand } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { select, selectRow } from "../../lib/components";
import { categoryEmbed, commandEmbed, overviewEmbed, populatedCategories, resolveCategory } from "../../lib/helpPages";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "help",
	description: "Lists everything the bot can do.",
	category: "info",
	options: [{ name: "query", description: "A command or category name.", type: "string", autocomplete: true }],

	async run(interaction, client) {
		const query = interaction.options.getString("query")?.toLowerCase().trim();

		if (query !== undefined && query.length > 0) {
			const command = client.commands.get(query);
			if (command) {
				await reply(interaction, { embeds: [commandEmbed(command)] });
				return;
			}

			const category = resolveCategory(query);
			if (category) {
				await reply(interaction, { embeds: [categoryEmbed(client, category)] });
				return;
			}

			throw new UserFacingError(`Nothing matches \`${query}\`. Run \`/help\` with no arguments to browse.`);
		}

		// The chosen category is carried in the custom ID, so two people running
		// /help at once cannot overwrite each other's page.
		const menu = select({
			id: customId("help", "category", interaction.user.id),
			placeholder: "Pick a category",
			options: populatedCategories(client).map((category) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(categoryLabel(category))
					.setValue(category)
					.setEmoji(categoryEmoji(category)),
			),
		});

		await reply(interaction, { embeds: [overviewEmbed(client)], components: [selectRow(menu)] });
	},

	async autocomplete(interaction, client) {
		const query = interaction.options.getFocused().toLowerCase();
		const names = [...client.commands.keys()].filter((name) => name.includes(query)).slice(0, 25);
		await interaction.respond(names.map((name) => ({ name, value: name })));
	},
});
