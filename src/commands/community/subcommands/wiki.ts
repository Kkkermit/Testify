import { z } from "zod";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds";
import { truncate } from "@lib/format";
import { fetchJson } from "@lib/http";
import { reply } from "@lib/reply";

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
	category: "community",
	cooldown: 5_000,
	options: [{ name: "query", description: "What to look up.", type: "string", required: true }],

	async run(interaction) {
		await interaction.deferReply();

		const query = interaction.options.getString("query", true).trim();
		const slug = encodeURIComponent(query.replace(/\s+/g, "_"));

		const summary = await fetchJson(
			"wikipedia",
			`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
			summarySchema,
			{ headers: { "User-Agent": "Testify Discord bot" } },
		).catch(() => null);

		if (!summary || summary.extract.length === 0) {
			throw new UserFacingError(`Wikipedia has no article matching **${query}**.`);
		}

		await reply(interaction, {
			embeds: [
				embed({
					category: "community",
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
