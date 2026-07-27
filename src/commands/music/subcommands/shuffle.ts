import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../lib/embeds";
import { requireQueue } from "../../../lib/musicGuards";
import { reply } from "../../../lib/reply";

export default defineCommand({
	name: "shuffle",
	description: "Shuffles the queue.",
	category: "music",
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		if (queue.songs.length < 3) throw new UserFacingError("There are not enough queued tracks to shuffle.");

		await queue.shuffle();
		await reply(interaction, {
			embeds: [embed({ category: "music", description: `${theme.music.shuffle} The queue has been shuffled.` })],
		});
	},
});
