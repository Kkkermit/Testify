import { randomInt } from "node:crypto";
import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { requireTextChannel } from "../../../core/guards";
import { fetchJson } from "../../../integrations/http";
import { embed } from "../../../ui/embeds";
import { titleCase } from "../../../ui/format";

const speciesSchema = z.object({
	name: z.string(),
	sprites: z.object({
		other: z.object({ "official-artwork": z.object({ front_default: z.string().nullable() }) }).optional(),
		front_default: z.string().nullable(),
	}),
});

/** The National Dex count at the time of writing; a miss simply rerolls. */
const MAX_DEX = 1_025;

export default defineCommand({
	name: "guess-the-pokemon",
	description: "Guess the Pokémon from its artwork.",
	category: Category.MiniGames,
	surfaces: ["slash", "prefix"],
	aliases: ["gtp", "whosthat"],
	guildOnly: true,
	cooldownMs: 15_000,

	async execute(ctx) {
		const channel = requireTextChannel(ctx);
		await ctx.defer();

		const species = await fetchJson(
			"pokeapi",
			`https://pokeapi.co/api/v2/pokemon/${randomInt(1, MAX_DEX + 1)}`,
			speciesSchema,
		);

		const artwork = species.sprites.other?.["official-artwork"].front_default ?? species.sprites.front_default;

		await ctx.reply({
			embeds: [
				embed({
					category: Category.MiniGames,
					title: "Who's that Pokémon?",
					description: "You have 30 seconds to guess.",
					...(artwork !== null ? { image: artwork } : {}),
				}),
			],
		});

		const collected = await channel
			.awaitMessages({
				filter: (message) => message.content.trim().toLowerCase() === species.name.toLowerCase(),
				max: 1,
				time: 30_000,
			})
			.catch(() => null);

		const winner = collected?.first();

		await ctx.followUp({
			embeds: [
				embed({
					category: Category.MiniGames,
					title: winner ? "Correct" : "Time is up",
					description: winner
						? `${winner.author} guessed it \u2014 it was **${titleCase(species.name)}**.`
						: `Nobody guessed it. It was **${titleCase(species.name)}**.`,
				}),
			],
		});
	},
});
