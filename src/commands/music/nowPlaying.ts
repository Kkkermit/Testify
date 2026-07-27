import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds";
import { progressBar } from "@lib/format";
import { requireQueue } from "@lib/musicGuards";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "now-playing",
	description: "Shows what is playing right now.",
	category: "music",
	aliases: ["np"],
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const song = queue.songs[0];
		if (!song) throw new UserFacingError("There is nothing playing right now.");

		await reply(interaction, {
			embeds: [
				embed({
					category: "music",
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
