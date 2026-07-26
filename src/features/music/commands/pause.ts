import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "pause",
	description: "Pauses playback.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		if (queue.paused) throw new UserFacingError("Playback is already paused.");

		await queue.pause();
		await ctx.reply({ embeds: [embed({ category: Category.Music, description: `${theme.music.pause} Paused.` })] });
	},
});
