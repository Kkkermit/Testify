import { z } from "zod";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds";
import { fetchJson } from "@lib/http";
import { reply } from "@lib/reply";

const factSchema = z.object({ fact: z.string(), image: z.url().optional() });

const SOURCES: Record<string, { url: string; emoji: string }> = {
	dog: { url: "https://some-random-api.com/animal/dog", emoji: "\u{1f436}" },
	cat: { url: "https://some-random-api.com/animal/cat", emoji: "\u{1f431}" },
	panda: { url: "https://some-random-api.com/animal/panda", emoji: "\u{1f43c}" },
	fox: { url: "https://some-random-api.com/animal/fox", emoji: "\u{1f98a}" },
	koala: { url: "https://some-random-api.com/animal/koala", emoji: "\u{1f428}" },
	bird: { url: "https://some-random-api.com/animal/bird", emoji: "\u{1f426}" },
};

export default defineCommand({
	name: "animal-fact",
	description: "Shares a fact and a photo of an animal.",
	category: "community",
	cooldown: 5_000,
	options: [
		{
			name: "animal",
			description: "Which animal.",
			type: "string",
			required: true,
			choices: Object.keys(SOURCES).map((animal) => ({ name: animal, value: animal })),
		},
	],

	async run(interaction) {
		await interaction.deferReply();

		const animal = interaction.options.getString("animal", true).toLowerCase();
		const source = SOURCES[animal] ?? SOURCES.dog!;
		const payload = await fetchJson("some-random-api", source.url, factSchema);

		await reply(interaction, {
			embeds: [
				embed({
					category: "community",
					title: `${source.emoji} ${animal} fact`,
					description: `> ${payload.fact}`,
					...(payload.image !== undefined ? { image: payload.image } : {}),
				}),
			],
		});
	},
});
