import { PermissionFlagsBits } from "discord.js";
import { strings } from "@config/strings";
import { defineCommand, inTextChannel } from "@core/command";
import { UserFacingError } from "@core/errors";
import { containsProfanity } from "@lib/contentFilter.util";
import { embed } from "@lib/embeds.util";
import { truncate } from "@lib/format.util";
import { requireVoice } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

const LANGUAGES = [
	{ name: "English", value: "en" },
	{ name: "Spanish", value: "es" },
	{ name: "French", value: "fr" },
	{ name: "German", value: "de" },
	{ name: "Italian", value: "it" },
	{ name: "Japanese", value: "ja" },
];

export default defineCommand({
	name: "tts",
	description: "Speaks a message in your voice channel.",
	category: "music",
	guildOnly: true,
	cooldown: 10_000,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [
		{ name: "message", description: "What to say.", type: "string", required: true, maxLength: 200 },
		{ name: "language", description: "Which voice to use.", type: "string", choices: LANGUAGES },
	],

	async run(interaction, client) {
		const { distube, voiceChannel, member } = requireVoice(interaction, client);
		const message = interaction.options.getString("message", true).trim();
		if (containsProfanity(message)) throw new UserFacingError(strings.generic.profanity);

		const language = interaction.options.getString("language") ?? "en";
		const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${language}&q=${encodeURIComponent(message)}`;

		await reply(interaction, {
			embeds: [embed({ category: "music", title: "Text to speech", description: `> ${truncate(message, 500)}` })],
		});

		await distube.play(voiceChannel, url, { member, textChannel: inTextChannel(interaction) });
	},
});
