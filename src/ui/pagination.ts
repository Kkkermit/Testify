import { type ActionRowBuilder, type EmbedBuilder, type MessageActionRowComponentBuilder } from "discord.js";
import { type TestifyClient } from "../core/client";
import { type ComponentHandler } from "../core/component";
import { type Namespace } from "../core/customId";
import { navRow } from "./components";
import { withPageFooter } from "./embeds";

export interface PaginationOptions<T> {
	items: T[];
	pageSize: number;
	namespace: Namespace;
	ownerId: string;
	/** Extra state carried in the custom ID, so a page can be rebuilt from nothing. */
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

/**
 * Builds one page plus its navigation row. Page state lives entirely in the custom
 * ID, so nothing is stored server-side, nothing leaks, and a page survives a
 * restart — unlike the previous paginators, one of which recovered its state by
 * regex-parsing the embed footer.
 */
export function buildPage<T>(options: PaginationOptions<T>, page = 0): RenderedPage {
	const total = pageCount(options.items.length, options.pageSize);
	const current = Math.min(Math.max(0, page), total - 1);
	const start = current * options.pageSize;
	const slice = options.items.slice(start, start + options.pageSize);

	const embed = withPageFooter(options.render(slice, current, total), current, total);
	const components = total > 1 ? [navRow(options.namespace, current, total, options.ownerId, options.key ?? "-")] : [];

	return { embeds: [embed], components };
}

/**
 * Registers one router entry for a paginated view. `resolve` rebuilds the item
 * list from the custom-ID key, which is why no session state is needed.
 */
export function createPaginationHandler<T>(config: {
	namespace: Namespace;
	pageSize: number;
	resolve(key: string, ctx: { client: TestifyClient; guildId: string | null; userId: string }): Promise<T[]>;
	render(pageItems: T[], page: number, totalPages: number): EmbedBuilder;
}): ComponentHandler {
	return {
		namespace: config.namespace,
		ownerOnly: true,
		async handle(ctx) {
			if (ctx.action !== "goto" || !ctx.interaction.isMessageComponent()) return;

			const [key = "-", rawPage = "0", ownerId = ctx.interaction.user.id] = ctx.args;
			const items = await config.resolve(key, {
				client: ctx.client,
				guildId: ctx.interaction.guildId,
				userId: ownerId,
			});

			const page = buildPage(
				{
					items,
					pageSize: config.pageSize,
					namespace: config.namespace,
					ownerId,
					key,
					render: (items, index, total) => config.render(items, index, total),
				},
				Number.parseInt(rawPage, 10) || 0,
			);

			await ctx.interaction.update({ embeds: page.embeds, components: page.components });
		},
	};
}
