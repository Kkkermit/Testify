import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inTextChannel } from "../../../core/command";
import { embed } from "../../../lib/embeds";
import { requireVoice } from "../../../lib/musicGuards";
import { reply } from "../../../lib/reply";

export default defineCommand({
	name: "play-top",
	description: "Adds a track to the front of the queue.",
	category: "music",
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [{ name: "query", description: "A URL or search terms.", type: "string", required: true }],

	async run(interaction, client) {
		const { distube, voiceChannel, member } = requireVoice(interaction, client);
		const query = interaction.options.getString("query", true);

		await reply(interaction, { embeds: [embed({ category: "music", description: `Queueing **${query}** next…` })] });

		await distube.play(voiceChannel, query, {
			member,
			textChannel: inTextChannel(interaction),
			position: 1,
		});
	},
});
