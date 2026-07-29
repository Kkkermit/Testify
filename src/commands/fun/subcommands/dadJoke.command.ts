import { z } from "zod";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds.util";
import { fetchJson } from "@lib/http.util";
import { reply } from "@lib/reply.util";

const jokeSchema = z.object({ id: z.string(), joke: z.string() });

export default defineCommand({
	name: "dad-joke",
	description: "Fetches a random dad joke.",
	category: "fun",
	cooldown: 5_000,

	async run(interaction) {
		await interaction.deferReply();

		const joke = await fetchJson("icanhazdadjoke", "https://icanhazdadjoke.com/", jokeSchema, {
			headers: { Accept: "application/json", "User-Agent": "Testify Discord bot" },
		});

		await reply(interaction, {
			embeds: [
				embed({
					category: "fun",
					title: "Dad joke",
					description: `> ${joke.joke}`,
					footer: `Joke ID: ${joke.id}`,
				}),
			],
		});
	},
});
