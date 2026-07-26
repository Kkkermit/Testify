import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { NotFoundError } from "../../../core/errors";
import { fetchJson } from "../../../integrations/http";
import { embed } from "../../../ui/embeds";
import { truncate } from "../../../ui/format";

const summarySchema = z.object({
	title: z.string(),
	extract: z.string().default(""),
	description: z.string().optional(),
	content_urls: z.object({ desktop: z.object({ page: z.string() }) }).optional(),
	thumbnail: z.object({ source: z.string() }).optional(),
});

/**
 * The `wikijs` dependency has been dropped in favour of Wikipedia's own REST
 * summary endpoint, which is typed at the boundary like every other API call.
 */
export default defineCommand({
	name: "wiki",
	description: "Looks something up on Wikipedia.",
	category: Category.Community,
	surfaces: ["slash", "prefix"],
	aliases: ["wikipedia"],
	cooldownMs: 5_000,
	options: [{ name: "query", description: "What to look up.", type: "string", required: true, greedy: true }],

	async execute(ctx) {
		await ctx.defer();

		const query = ctx.options.getString("query", true).trim();
		const slug = encodeURIComponent(query.replace(/\s+/g, "_"));

		const summary = await fetchJson(
			"wikipedia",
			`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
			summarySchema,
			{ headers: { "User-Agent": "Testify Discord bot" } },
		).catch(() => null);

		if (!summary || summary.extract.length === 0) {
			throw new NotFoundError(`Wikipedia has no article matching **${query}**.`);
		}

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Community,
					title: summary.title,
					description: truncate(summary.extract, 1_500),
					...(summary.content_urls ? { url: summary.content_urls.desktop.page } : {}),
					...(summary.thumbnail ? { thumbnail: summary.thumbnail.source } : {}),
					footer: summary.description ?? "Wikipedia",
				}),
			],
		});
	},
});
