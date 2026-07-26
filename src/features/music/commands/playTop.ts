import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { requireTextChannel } from "../../../core/guards";
import { embed } from "../../../ui/embeds";
import { requireVoice } from "../services/musicGuards";

export default defineCommand({
	name: "play-top",
	description: "Adds a track to the front of the queue.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["playtop", "pt"],
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [{ name: "query", description: "A URL or search terms.", type: "string", required: true, greedy: true }],

	async execute(ctx) {
		const { distube, voiceChannel, member } = requireVoice(ctx);
		const query = ctx.options.getString("query", true);

		await ctx.reply({ embeds: [embed({ category: Category.Music, description: `Queueing **${query}** next…` })] });

		await distube.play(voiceChannel, query, {
			member,
			textChannel: requireTextChannel(ctx),
			position: 1,
		});
	},
});
