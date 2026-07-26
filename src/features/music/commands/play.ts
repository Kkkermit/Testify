import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { requireTextChannel } from "../../../core/guards";
import { embed } from "../../../ui/embeds";
import { requireVoice } from "../services/musicGuards";

/**
 * All playback was prefix-only before. Every music command now declares both
 * surfaces, which the shared core makes essentially free.
 */
export default defineCommand({
	name: "play",
	description: "Plays a track, playlist or search query.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["p"],
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [{ name: "query", description: "A URL or search terms.", type: "string", required: true, greedy: true }],

	async execute(ctx) {
		const { distube, voiceChannel, member } = requireVoice(ctx);
		const query = ctx.options.getString("query", true);

		await ctx.reply({
			embeds: [embed({ category: Category.Music, description: `${theme.music.play} Looking for **${query}**…` })],
		});

		await distube.play(voiceChannel, query, {
			member,
			textChannel: requireTextChannel(ctx),
		});
	},
});
