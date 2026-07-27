import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds";
import { requireQueue } from "@lib/musicGuards";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "stop",
	description: "Stops playback and clears the queue.",
	category: "music",
	aliases: ["disconnect"],
	// `leave` used to be an alias here and a command name elsewhere, so it was
	// permanently shadowed. Alias collisions now fail at boot instead.
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		await queue.stop();

		await reply(interaction, {
			embeds: [
				embed({ category: "music", description: `${theme.music.stop} Playback stopped and the queue cleared.` }),
			],
		});
	},
});
