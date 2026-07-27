import { DEFAULT_PREFIX } from "@config/constants";
import { defineButton } from "@core/button";
import { getPrefix } from "@database/repositories/settingsRepository";
import {
	categoryControls,
	categoryMenu,
	categoryPage,
	HELP_HOME,
	helpHome,
	helpLinks,
	pagesOf,
	resolveCategory,
	resolveSurface,
} from "@lib/helpPages.util";

/**
 * Drives the help menu. Everything it needs — which category, which page, and
 * whether slash or prefix commands are being shown — travels in the custom ID,
 * so two people can browse at once and a restart does not break the buttons.
 */
export default defineButton({
	id: "help",
	ownerOnly: true,

	async run(interaction, context) {
		const { client, action, args } = context;
		const prefix = interaction.guildId === null ? DEFAULT_PREFIX : await getPrefix(interaction.guildId);
		const ownerId = args.at(-1) ?? interaction.user.id;

		if (action === "noop") return;

		if (action === "pick" && interaction.isStringSelectMenu()) {
			const surface = resolveSurface(args[0]);
			const chosen = interaction.values[0] ?? HELP_HOME;

			if (chosen === HELP_HOME) {
				await interaction.update({
					embeds: [helpHome(client, surface, prefix)],
					components: [categoryMenu(client, surface, null, ownerId), helpLinks()],
				});
				return;
			}

			const category = resolveCategory(chosen);
			if (!category) return;

			await interaction.update({
				embeds: [categoryPage(client, category, 0, surface, prefix)],
				components: [
					categoryMenu(client, surface, category, ownerId),
					categoryControls(category, 0, pagesOf(client, category).length, surface, ownerId),
				],
			});
			return;
		}

		// "page" moves within a category; "swap" shows the same page the other way round.
		if ((action === "page" || action === "swap") && interaction.isButton()) {
			const surface = resolveSurface(args[0]);
			const category = resolveCategory(args[1] ?? "");
			if (!category) return;

			const pages = pagesOf(client, category);
			const page = Math.min(Math.max(0, Number.parseInt(args[2] ?? "0", 10) || 0), pages.length - 1);

			await interaction.update({
				embeds: [categoryPage(client, category, page, surface, prefix)],
				components: [
					categoryMenu(client, surface, category, ownerId),
					categoryControls(category, page, pages.length, surface, ownerId),
				],
			});
		}
	},
});
