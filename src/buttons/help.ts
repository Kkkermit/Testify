import { StringSelectMenuOptionBuilder } from "discord.js";
import { categoryEmoji, categoryLabel } from "../config/categories";
import { customId, defineButton } from "../core/button";
import { select, selectRow } from "../lib/components";
import { categoryEmbed, overviewEmbed, populatedCategories, resolveCategory } from "../lib/helpPages";

export default defineButton({
	id: "help",
	ownerOnly: true,

	async run(interaction, context) {
		if (!interaction.isStringSelectMenu()) return;

		const ownerId = context.args[0] ?? interaction.user.id;
		const chosen = interaction.values[0] ?? "";
		const category = resolveCategory(chosen);

		const menu = select({
			id: customId("help", "category", ownerId),
			placeholder: "Pick a category",
			options: populatedCategories(context.client).map((entry) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(categoryLabel(entry))
					.setValue(entry)
					.setEmoji(categoryEmoji(entry))
					.setDefault(entry === category),
			),
		});

		await interaction.update({
			embeds: [category ? categoryEmbed(context.client, category) : overviewEmbed(context.client)],
			components: [selectRow(menu)],
		});
	},
});
