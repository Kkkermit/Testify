import { theme } from "../../config/theme";
import { defineCommand } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { embed } from "../../lib/embeds";
import { requireQueue } from "../../lib/musicGuards";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "resume",
	description: "Resumes playback.",
	category: "music",
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		if (!queue.paused) throw new UserFacingError("Playback is not paused.");

		await queue.resume();
		await reply(interaction, { embeds: [embed({ category: "music", description: `${theme.music.play} Resumed.` })] });
	},
});
