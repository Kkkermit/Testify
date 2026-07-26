import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "stop",
	description: "Stops playback and clears the queue.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	// `leave` used to be an alias here and a command name elsewhere, so it was
	// permanently shadowed. Alias collisions now fail at boot instead.
	aliases: ["disconnect"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		await queue.stop();

		await ctx.reply({
			embeds: [
				embed({ category: Category.Music, description: `${theme.music.stop} Playback stopped and the queue cleared.` }),
			],
		});
	},
});
