import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { requireQueue } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "skip-to",
	description: "Jumps to a specific position in the queue.",
	category: "music",
	guildOnly: true,
	options: [
		{ name: "position", description: "The queue position to jump to.", type: "integer", required: true, min: 1 },
	],

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const position = interaction.options.getInteger("position", true);

		if (position >= queue.songs.length) {
			throw new UserFacingError(`There are only ${Math.max(0, queue.songs.length - 1)} tracks queued after this one.`);
		}

		const song = await queue.jump(position);
		await reply(interaction, {
			embeds: [embed({ category: "music", description: `Jumped to **${song.name ?? "that track"}**.` })],
		});
	},
});
