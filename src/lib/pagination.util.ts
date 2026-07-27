import { type ActionRowBuilder, type EmbedBuilder, type MessageActionRowComponentBuilder } from "discord.js";
import { type Button, defineButton } from "@core/button";
import { type TestifyClient } from "@core/client";
import { navRow } from "@lib/components.util";
import { withPageFooter } from "@lib/embeds.util";

export interface PageOptions<T> {
	items: T[];
	pageSize: number;
	/** The button id that owns the navigation controls. */
	id: string;
	ownerId: string;
	/** Extra state carried in the custom ID so a page can be rebuilt from nothing. */
	key?: string;
	render(pageItems: T[], page: number, totalPages: number): EmbedBuilder;
}

export interface RenderedPage {
	embeds: EmbedBuilder[];
	components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}

export function pageCount(total: number, pageSize: number): number {
	return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/** Builds one page and its navigation row. */
export function buildPage<T>(options: PageOptions<T>, page = 0): RenderedPage {
	const total = pageCount(options.items.length, options.pageSize);
	const current = Math.min(Math.max(0, page), total - 1);
	const start = current * options.pageSize;
	const slice = options.items.slice(start, start + options.pageSize);

	const rendered = withPageFooter(options.render(slice, current, total), current, total);
	const components = total > 1 ? [navRow(options.id, current, total, options.ownerId, options.key ?? "-")] : [];

	return { embeds: [rendered], components };
}

/**
 * Turns a list into a paged view with working arrows. `resolve` rebuilds the list
 * from the key stored in the custom ID, so no page state is kept in memory.
 */
export function paginatedButton<T>(config: {
	id: string;
	pageSize: number;
	resolve(key: string, context: { client: TestifyClient; guildId: string | null; userId: string }): Promise<T[]>;
	render(pageItems: T[], page: number, totalPages: number): EmbedBuilder;
}): Button {
	return defineButton({
		id: config.id,
		ownerOnly: true,
		async run(interaction, context) {
			if (context.action !== "goto" || !interaction.isMessageComponent()) return;

			const [key = "-", rawPage = "0", ownerId = interaction.user.id] = context.args;
			const items = await config.resolve(key, {
				client: context.client,
				guildId: interaction.guildId,
				userId: ownerId,
			});

			const page = buildPage(
				{
					items,
					pageSize: config.pageSize,
					id: config.id,
					ownerId,
					key,
					render: (pageItems, page, total) => config.render(pageItems, page, total),
				},
				Number.parseInt(rawPage, 10) || 0,
			);

			await interaction.update({ embeds: page.embeds, components: page.components });
		},
	});
}
