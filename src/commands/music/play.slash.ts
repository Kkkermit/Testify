import { PermissionFlagsBits } from "discord.js";
import { theme } from "@config/theme";
import { defineCommand, inTextChannel } from "@core/command";
import { toError, UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { explainPlaybackFailure } from "@lib/music.util";
import { requireVoice } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

/**
 * All playback was prefix-only before. Every music command now declares both
 * surfaces, which the shared core makes essentially free.
 */
export default defineCommand({
	name: "play",
	description: "Plays a track, playlist or search query.",
	category: "music",
	aliases: ["p"],
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [{ name: "query", description: "A URL or search terms.", type: "string", required: true }],

	async run(interaction, client) {
		const { distube, voiceChannel, member } = requireVoice(interaction, client);
		const query = interaction.options.getString("query", true);

		await reply(interaction, {
			embeds: [embed({ category: "music", description: `${theme.music.play} Looking for **${query}**…` })],
		});

		try {
			await distube.play(voiceChannel, query, {
				member,
				textChannel: inTextChannel(interaction),
			});
		} catch (error) {
			// A resolve failure would otherwise surface as a generic error while the
			// queue quietly ends, which is indistinguishable from the track finishing.
			client.logger.error({ err: toError(error), query }, "[MUSIC_ERROR] Could not start playback");
			throw new UserFacingError(explainPlaybackFailure(error));
		}
	},
});
