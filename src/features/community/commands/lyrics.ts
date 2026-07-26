import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { NotFoundError } from "../../../core/errors";
import { fetchJson } from "../../../integrations/http";
import { embed } from "../../../ui/embeds";
import { truncate } from "../../../ui/format";

const lyricsSchema = z.object({ lyrics: z.string() });

export default defineCommand({
	name: "lyrics",
	description: "Finds the lyrics to a song.",
	category: Category.Community,
	surfaces: ["slash", "prefix"],
	cooldownMs: 5_000,
	options: [
		{ name: "artist", description: "The artist.", type: "string", required: true },
		{ name: "title", description: "The song title.", type: "string", required: true, greedy: true },
	],

	async execute(ctx) {
		await ctx.defer();

		const artist = ctx.options.getString("artist", true).trim();
		const title = ctx.options.getString("title", true).trim();

		const payload = await fetchJson(
			"lyrics.ovh",
			`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
			lyricsSchema,
		).catch(() => null);

		if (!payload || payload.lyrics.trim().length === 0) {
			throw new NotFoundError(`I could not find lyrics for **${title}** by **${artist}**.`);
		}

		const cleaned = payload.lyrics.replace(/\r\n/g, "\n").trim();

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Community,
					title: `${title} \u2014 ${artist}`,
					description: truncate(cleaned, 4_000),
					footer: cleaned.length > 4_000 ? "Lyrics truncated" : "Lyrics",
				}),
			],
		});
	},
});
