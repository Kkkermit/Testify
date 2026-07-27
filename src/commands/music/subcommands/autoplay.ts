import { defineCommand } from "../../../core/command";
import { embed } from "../../../lib/embeds";
import { requireQueue } from "../../../lib/musicGuards";
import { reply } from "../../../lib/reply";

export default defineCommand({
	name: "autoplay",
	description: "Toggles automatic related-track playback.",
	category: "music",
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const enabled = queue.toggleAutoplay();

		await reply(interaction, {
			embeds: [
				embed({
					category: "music",
					description: enabled
						? "Autoplay is on. I will keep playing related tracks when the queue empties."
						: "Autoplay is off.",
				}),
			],
		});
	},
});
