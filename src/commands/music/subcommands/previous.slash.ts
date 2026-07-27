import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { requireQueue } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "previous",
	description: "Goes back to the previous track.",
	category: "music",
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		if (queue.previousSongs.length === 0) throw new UserFacingError("There is no previous track.");

		const song = await queue.previous();
		await reply(interaction, {
			embeds: [
				embed({
					category: "music",
					description: `${theme.music.previous} Now playing **${song.name ?? "the previous track"}**.`,
				}),
			],
		});
	},
});
