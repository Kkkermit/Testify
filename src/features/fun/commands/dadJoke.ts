import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { fetchJson } from "../../../integrations/http";
import { embed } from "../../../ui/embeds";

const jokeSchema = z.object({ id: z.string(), joke: z.string() });

export default defineCommand({
	name: "dad-joke",
	description: "Fetches a random dad joke.",
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	aliases: ["dadjoke", "dadj"],
	cooldownMs: 5_000,

	async execute(ctx) {
		await ctx.defer();

		const joke = await fetchJson("icanhazdadjoke", "https://icanhazdadjoke.com/", jokeSchema, {
			headers: { Accept: "application/json", "User-Agent": "Testify Discord bot" },
		});

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Fun,
					title: "Dad joke",
					description: `> ${joke.joke}`,
					footer: `Joke ID: ${joke.id}`,
				}),
			],
		});
	},
});
