import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";
import { requireVoice } from "../services/musicGuards";

export default defineCommand({
	name: "join",
	description: "Brings the bot into your voice channel.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["summon"],
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],

	async execute(ctx) {
		const { distube, voiceChannel } = requireVoice(ctx);
		await distube.voices.join(voiceChannel);

		await ctx.reply({
			embeds: [embed({ category: Category.Music, description: `Joined ${voiceChannel}.` })],
		});
	},
});
