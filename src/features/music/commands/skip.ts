import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "skip",
	description: "Skips the current track.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["s", "next"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		if (queue.songs.length <= 1 && !queue.autoplay) {
			throw new UserFacingError("There is nothing queued after this track. Use `/stop` instead.");
		}

		const next = await queue.skip();
		await ctx.reply({
			embeds: [
				embed({
					category: Category.Music,
					description: `${theme.music.skip} Skipped. Now playing **${next.name ?? "the next track"}**.`,
				}),
			],
		});
	},
});
