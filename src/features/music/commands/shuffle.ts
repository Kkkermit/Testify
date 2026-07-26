import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "shuffle",
	description: "Shuffles the queue.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		if (queue.songs.length < 3) throw new UserFacingError("There are not enough queued tracks to shuffle.");

		await queue.shuffle();
		await ctx.reply({
			embeds: [embed({ category: Category.Music, description: `${theme.music.shuffle} The queue has been shuffled.` })],
		});
	},
});
