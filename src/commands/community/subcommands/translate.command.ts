import { z } from "zod";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { truncate } from "@lib/format.util";
import { fetchJson } from "@lib/http.util";
import { reply } from "@lib/reply.util";

/**
 * The `@iamtraction/google-translate` package was imported but never declared as a
 * dependency, and shipped no types. This calls the same public endpoint directly,
 * validated at the boundary.
 */
const responseSchema = z.tuple([z.array(z.array(z.string().nullable())), z.unknown(), z.string()]).rest(z.unknown());

const LANGUAGES = [
	{ name: "English", value: "en" },
	{ name: "Spanish", value: "es" },
	{ name: "French", value: "fr" },
	{ name: "German", value: "de" },
	{ name: "Italian", value: "it" },
	{ name: "Portuguese", value: "pt" },
	{ name: "Dutch", value: "nl" },
	{ name: "Polish", value: "pl" },
	{ name: "Russian", value: "ru" },
	{ name: "Japanese", value: "ja" },
	{ name: "Korean", value: "ko" },
	{ name: "Chinese", value: "zh-CN" },
	{ name: "Arabic", value: "ar" },
	{ name: "Hindi", value: "hi" },
	{ name: "Turkish", value: "tr" },
];

export default defineCommand({
	name: "translate",
	description: "Translates text into another language.",
	category: "community",
	cooldown: 5_000,
	options: [
		{ name: "to", description: "The target language.", type: "string", required: true, choices: LANGUAGES },
		{
			name: "text",
			description: "The text to translate.",
			type: "string",
			required: true,
			maxLength: 900,
		},
	],

	async run(interaction) {
		await interaction.deferReply();

		const target = interaction.options.getString("to", true);
		const text = interaction.options.getString("text", true);

		const payload = await fetchJson(
			"google-translate",
			"https://translate.googleapis.com/translate_a/single",
			responseSchema,
			{
				query: { client: "gtx", sl: "auto", tl: target, dt: "t", q: text },
			},
		);

		const translated = payload[0]
			.map((segment) => segment[0] ?? "")
			.join("")
			.trim();

		if (translated.length === 0) throw new UserFacingError("I could not translate that.");

		await reply(interaction, {
			embeds: [
				embed({
					category: "community",
					title: "Translation",
					fields: [
						{ name: `Original (${payload[2]})`, value: truncate(text, 1_000) },
						{ name: `Translated (${target})`, value: truncate(translated, 1_000) },
					],
				}),
			],
		});
	},
});
