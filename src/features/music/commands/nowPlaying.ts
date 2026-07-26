import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { progressBar } from "../../../ui/format";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "now-playing",
	description: "Shows what is playing right now.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["np", "nowplaying"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const song = queue.songs[0];
		if (!song) throw new UserFacingError("There is nothing playing right now.");

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Music,
					title: `${theme.music.play} Now playing`,
					description: [
						`**[${song.name ?? "Unknown track"}](${song.url})**`,
						"",
						`${queue.formattedCurrentTime} ${progressBar(queue.currentTime, song.duration || 1)} ${song.formattedDuration}`,
					].join("\n"),
					fields: [
						{ name: "Requested by", value: song.user?.toString() ?? "unknown", inline: true },
						{ name: "Volume", value: `${queue.volume}%`, inline: true },
						{ name: "Loop", value: repeatLabel(queue.repeatMode), inline: true },
					],
					...(song.thumbnail !== undefined ? { thumbnail: song.thumbnail } : {}),
				}),
			],
		});
	},
});

function repeatLabel(mode: number): string {
	switch (mode) {
		case 1:
			return "Track";
		case 2:
			return "Queue";
		default:
			return "Off";
	}
}
