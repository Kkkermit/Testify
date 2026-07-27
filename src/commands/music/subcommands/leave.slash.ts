import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { requireVoice } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "leave",
	description: "Disconnects the bot from the voice channel.",
	category: "music",
	guildOnly: true,

	async run(interaction, client) {
		const guild = inGuild(interaction);
		const { distube } = requireVoice(interaction, client);

		if (!guild.members.me?.voice.channel) throw new UserFacingError("I am not in a voice channel.");

		distube.voices.leave(guild);
		await reply(interaction, { embeds: [embed({ category: "music", description: "Left the voice channel." })] });
	},
});
