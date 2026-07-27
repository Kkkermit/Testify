import { DEFAULT_PREFIX } from "@config/constants";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getPrefix } from "@database/repositories/settingsRepository";
import {
	categoryControls,
	categoryMenu,
	categoryPage,
	commandPage,
	helpHome,
	helpLinks,
	pagesOf,
	resolveCategory,
} from "@lib/helpPages";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "help",
	description: "Everything the bot can do, category by category.",
	category: "info",
	aliases: ["commands", "h"],
	options: [{ name: "query", description: "A command or category name.", type: "string", autocomplete: true }],

	async run(interaction, client) {
		const prefix = interaction.guild ? await getPrefix(interaction.guild.id) : DEFAULT_PREFIX;
		const query = interaction.options.getString("query")?.toLowerCase().trim();
		const surface = "slash";

		if (query !== undefined && query !== "") {
			const alias = client.aliases.get(query)?.split(" ")[0];
			const command = client.commands.get(query) ?? client.commands.get(alias ?? "");

			if (command) {
				await reply(interaction, { embeds: [commandPage(command, surface, prefix)] });
				return;
			}

			const category = resolveCategory(query);
			if (category) {
				const pages = pagesOf(client, category);
				await reply(interaction, {
					embeds: [categoryPage(client, category, 0, surface, prefix)],
					components: [
						categoryMenu(client, surface, category, interaction.user.id),
						categoryControls(category, 0, pages.length, surface, interaction.user.id),
					],
				});
				return;
			}

			throw new UserFacingError(`Nothing matches \`${query}\`. Run \`/help\` on its own to browse everything.`);
		}

		await reply(interaction, {
			embeds: [helpHome(client, surface, prefix)],
			components: [categoryMenu(client, surface, null, interaction.user.id), helpLinks()],
		});
	},

	async autocomplete(interaction, client) {
		const query = interaction.options.getFocused().toLowerCase();
		const names = [...client.commands.keys()].filter((name) => name.includes(query)).slice(0, 25);
		await interaction.respond(names.map((name) => ({ name, value: name })));
	},
});
