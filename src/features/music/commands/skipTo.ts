import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "skip-to",
	description: "Jumps to a specific position in the queue.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["skipto", "jump"],
	guildOnly: true,
	options: [
		{ name: "position", description: "The queue position to jump to.", type: "integer", required: true, minValue: 1 },
	],

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const position = ctx.options.getInteger("position", true);

		if (position >= queue.songs.length) {
			throw new UserFacingError(`There are only ${Math.max(0, queue.songs.length - 1)} tracks queued after this one.`);
		}

		const song = await queue.jump(position);
		await ctx.reply({
			embeds: [embed({ category: Category.Music, description: `Jumped to **${song.name ?? "that track"}**.` })],
		});
	},
});
