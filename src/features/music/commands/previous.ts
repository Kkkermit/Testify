import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "previous",
	description: "Goes back to the previous track.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["prev", "back"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		if (queue.previousSongs.length === 0) throw new UserFacingError("There is no previous track.");

		const song = await queue.previous();
		await ctx.reply({
			embeds: [
				embed({
					category: Category.Music,
					description: `${theme.music.previous} Now playing **${song.name ?? "the previous track"}**.`,
				}),
			],
		});
	},
});
