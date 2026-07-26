import { theme } from "../../config/theme";
import { defineCommand } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { embed } from "../../lib/embeds";
import { requireQueue } from "../../lib/musicGuards";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "pause",
	description: "Pauses playback.",
	category: "music",
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		if (queue.paused) throw new UserFacingError("Playback is already paused.");

		await queue.pause();
		await reply(interaction, { embeds: [embed({ category: "music", description: `${theme.music.pause} Paused.` })] });
	},
});
