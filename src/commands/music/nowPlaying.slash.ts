import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { requireQueue } from "@lib/musicGuards.util";
import { musicPanel } from "@lib/musicPanel.util";
import { panelStateOf } from "@lib/musicQueue.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "now-playing",
	description: "Opens the player controls for whatever is playing.",
	category: "music",
	aliases: ["np", "player"],
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		if (!queue.songs[0]) throw new UserFacingError("There is nothing playing right now.");

		await reply(interaction, musicPanel(panelStateOf(queue)));
	},
});
