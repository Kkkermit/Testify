import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "autoplay",
	description: "Toggles automatic related-track playback.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const enabled = queue.toggleAutoplay();

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Music,
					description: enabled
						? "Autoplay is on. I will keep playing related tracks when the queue empties."
						: "Autoplay is off.",
				}),
			],
		});
	},
});
