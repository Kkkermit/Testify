import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { requireQueue } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "skip",
	description: "Skips the current track.",
	category: "music",
	aliases: ["s", "next"],
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		if (queue.songs.length <= 1 && !queue.autoplay) {
			throw new UserFacingError("There is nothing queued after this track. Use `/stop` instead.");
		}

		const next = await queue.skip();
		await reply(interaction, {
			embeds: [
				embed({
					category: "music",
					description: `${theme.music.skip} Skipped. Now playing **${next.name ?? "the next track"}**.`,
				}),
			],
		});
	},
});
