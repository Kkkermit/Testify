import { PermissionFlagsBits } from "discord.js";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds.util";
import { requireVoice } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "join",
	description: "Brings the bot into your voice channel.",
	category: "music",
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],

	async run(interaction, client) {
		const { distube, voiceChannel } = requireVoice(interaction, client);
		await distube.voices.join(voiceChannel);

		await reply(interaction, {
			embeds: [embed({ category: "music", description: `Joined ${voiceChannel}.` })],
		});
	},
});
