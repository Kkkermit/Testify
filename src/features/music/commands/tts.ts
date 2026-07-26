import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { containsProfanity } from "../../../core/contentFilter";
import { UserFacingError } from "../../../core/errors";
import { requireTextChannel } from "../../../core/guards";
import { embed } from "../../../ui/embeds";
import { truncate } from "../../../ui/format";
import { requireVoice } from "../services/musicGuards";

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
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	cooldownMs: 10_000,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [
		{ name: "message", description: "What to say.", type: "string", required: true, maxLength: 200, greedy: true },
		{ name: "language", description: "Which voice to use.", type: "string", choices: LANGUAGES },
	],

	async execute(ctx) {
		const { distube, voiceChannel, member } = requireVoice(ctx);
		const message = ctx.options.getString("message", true).trim();
		if (containsProfanity(message)) throw new UserFacingError(strings.generic.profanity);

		const language = ctx.options.getString("language") ?? "en";
		const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${language}&q=${encodeURIComponent(message)}`;

		await ctx.reply({
			embeds: [
				embed({ category: Category.Music, title: "Text to speech", description: `> ${truncate(message, 500)}` }),
			],
		});

		await distube.play(voiceChannel, url, { member, textChannel: requireTextChannel(ctx) });
	},
});
