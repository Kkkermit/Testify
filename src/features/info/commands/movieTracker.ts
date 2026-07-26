import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { ConfigurationError, NotFoundError } from "../../../core/errors";
import { fetchJson } from "../../../integrations/http";
import { embed } from "../../../ui/embeds";
import { truncate } from "../../../ui/format";

const movieSchema = z.object({
	title: z.string(),
	overview: z.string().default(""),
	release_date: z.string().optional(),
	poster_path: z.string().nullable().optional(),
	popularity: z.number().optional(),
	original_language: z.string().optional(),
	vote_average: z.number().optional(),
	adult: z.boolean().optional(),
});

const searchSchema = z.object({ results: z.array(movieSchema) });

export default defineCommand({
	name: "movie-tracker",
	description: "Looks up information about a film.",
	category: Category.Info,
	surfaces: ["slash", "prefix"],
	aliases: ["movie", "film"],
	cooldownMs: 5_000,
	options: [{ name: "name", description: "The film to search for.", type: "string", required: true, greedy: true }],

	async execute(ctx) {
		const apiKey = ctx.client.env.TMDB_API_KEY;
		if (apiKey === undefined) {
			throw new ConfigurationError("TMDB_API_KEY is not configured, so film lookups are unavailable.");
		}

		await ctx.defer();

		const query = ctx.options.getString("name", true);
		const { results } = await fetchJson("tmdb", "https://api.themoviedb.org/3/search/movie", searchSchema, {
			query: { api_key: apiKey, query },
		});

		const movie = results[0];
		if (!movie) throw new NotFoundError(`No film matching **${query}** was found.`);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Info,
					title: movie.title,
					description: truncate(movie.overview.length > 0 ? movie.overview : "No description available.", 1_000),
					fields: [
						{ name: "Released", value: movie.release_date ?? "Unknown", inline: true },
						{ name: "Rating", value: `${movie.vote_average?.toFixed(1) ?? "?"} / 10`, inline: true },
						{ name: "Language", value: movie.original_language?.toUpperCase() ?? "Unknown", inline: true },
						{ name: "Popularity", value: movie.popularity?.toFixed(1) ?? "Unknown", inline: true },
						{ name: "Adult", value: movie.adult === true ? "Yes" : "No", inline: true },
					],
					...(movie.poster_path ? { image: `https://image.tmdb.org/t/p/w500${movie.poster_path}` } : {}),
					footer: "Data from The Movie Database",
				}),
			],
		});
	},
});
