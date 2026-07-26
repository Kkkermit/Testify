import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "resume",
	description: "Resumes playback.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["unpause"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		if (!queue.paused) throw new UserFacingError("Playback is not paused.");

		await queue.resume();
		await ctx.reply({ embeds: [embed({ category: Category.Music, description: `${theme.music.play} Resumed.` })] });
	},
});
