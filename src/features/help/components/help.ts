import { StringSelectMenuOptionBuilder } from "discord.js";
import { categoryEmoji, categoryLabel } from "../../../config/categories";
import { DEFAULT_PREFIX } from "../../../config/constants";
import { defineComponent } from "../../../core/component";
import { encodeId, Namespace } from "../../../core/customId";
import { getGuildSettings } from "../../../database/repositories/guildSettingsRepository";
import { select, selectRow } from "../../../ui/components";
import { categoryEmbed, overviewEmbed, populatedCategories, resolveCategory } from "../services/helpPages";

export default defineComponent({
	namespace: Namespace.Help,
	ownerOnly: true,

	async handle(ctx) {
		if (!ctx.interaction.isStringSelectMenu()) return;

		const ownerId = ctx.args[0] ?? ctx.interaction.user.id;
		const prefix = ctx.interaction.guildId ? (await getGuildSettings(ctx.interaction.guildId)).prefix : DEFAULT_PREFIX;

		const chosen = ctx.interaction.values[0] ?? "";
		const category = resolveCategory(chosen);

		const menu = select({
			id: encodeId(Namespace.Help, "category", ownerId),
			placeholder: "Pick a category",
			options: populatedCategories(ctx.client).map((entry) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(categoryLabel[entry])
					.setValue(entry)
					.setEmoji(categoryEmoji[entry])
					.setDefault(entry === category),
			),
		});

		await ctx.interaction.update({
			embeds: [category ? categoryEmbed(ctx.client, category, prefix) : overviewEmbed(ctx.client, prefix)],
			components: [selectRow(menu)],
		});
	},
});
