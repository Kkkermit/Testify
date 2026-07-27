import { randomInt } from "node:crypto";
import { z } from "zod";
import { defineCommand, inTextChannel } from "../../../core/command";
import { embed } from "../../../lib/embeds";
import { titleCase } from "../../../lib/format";
import { fetchJson } from "../../../lib/http";
import { reply } from "../../../lib/reply";

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
	category: "games",
	guildOnly: true,
	cooldown: 15_000,

	async run(interaction) {
		const channel = inTextChannel(interaction);
		await interaction.deferReply();

		const species = await fetchJson(
			"pokeapi",
			`https://pokeapi.co/api/v2/pokemon/${randomInt(1, MAX_DEX + 1)}`,
			speciesSchema,
		);

		const artwork = species.sprites.other?.["official-artwork"].front_default ?? species.sprites.front_default;

		await reply(interaction, {
			embeds: [
				embed({
					category: "games",
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

		await interaction.followUp({
			embeds: [
				embed({
					category: "games",
					title: winner ? "Correct" : "Time is up",
					description: winner
						? `${winner.author} guessed it \u2014 it was **${titleCase(species.name)}**.`
						: `Nobody guessed it. It was **${titleCase(species.name)}**.`,
				}),
			],
		});
	},
});
