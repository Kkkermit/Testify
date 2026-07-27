import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inTextChannel } from "@core/command";
import { embed } from "@lib/embeds.util";
import { requireVoice } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "play-skip",
	description: "Plays a track immediately, skipping what is playing.",
	category: "music",
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [{ name: "query", description: "A URL or search terms.", type: "string", required: true }],

	async run(interaction, client) {
		const { distube, voiceChannel, member, guildId } = requireVoice(interaction, client);
		const query = interaction.options.getString("query", true);

		await reply(interaction, { embeds: [embed({ category: "music", description: `Playing **${query}** now…` })] });

		await distube.play(voiceChannel, query, {
			member,
			textChannel: inTextChannel(interaction),
			position: 1,
		});

		const queue = distube.getQueue(guildId);
		if (queue && queue.songs.length > 1) await queue.skip();
	},
});
