import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { requireTextChannel } from "../../../core/guards";
import { embed } from "../../../ui/embeds";
import { requireVoice } from "../services/musicGuards";

export default defineCommand({
	name: "play-skip",
	description: "Plays a track immediately, skipping what is playing.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["playskip", "ps"],
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [{ name: "query", description: "A URL or search terms.", type: "string", required: true, greedy: true }],

	async execute(ctx) {
		const { distube, voiceChannel, member, guildId } = requireVoice(ctx);
		const query = ctx.options.getString("query", true);

		await ctx.reply({ embeds: [embed({ category: Category.Music, description: `Playing **${query}** now…` })] });

		await distube.play(voiceChannel, query, {
			member,
			textChannel: requireTextChannel(ctx),
			position: 1,
		});

		const queue = distube.getQueue(guildId);
		if (queue && queue.songs.length > 1) await queue.skip();
	},
});
