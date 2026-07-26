import { theme } from "../../config/theme";
import { defineCommand } from "../../core/command";
import { embed } from "../../lib/embeds";
import { formatTrackTime, truncate } from "../../lib/format";
import { requireQueue } from "../../lib/musicGuards";
import { buildPage } from "../../lib/pagination";
import { reply } from "../../lib/reply";

const PAGE_SIZE = 10;

export default defineCommand({
	name: "queue",
	description: "Shows the current queue.",
	category: "music",
	aliases: ["q"],
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const [current, ...upcoming] = queue.songs;

		const page = buildPage(
			{
				items: upcoming,
				pageSize: PAGE_SIZE,
				id: "music",
				ownerId: interaction.user.id,
				render: (items, index) =>
					embed({
						category: "music",
						title: `${theme.music.queue} Queue`,
						description: [
							`**Now playing**\n[${truncate(current?.name ?? "Unknown", 60)}](${current?.url ?? ""}) — ${current?.formattedDuration ?? "unknown"}`,
							"",
							items.length > 0
								? items
										.map(
											(song, offset) =>
												`\`${index * PAGE_SIZE + offset + 1}.\` [${truncate(song.name ?? "Unknown", 50)}](${song.url}) — ${song.formattedDuration}`,
										)
										.join("\n")
								: "Nothing else is queued.",
						].join("\n"),
						footer: `${upcoming.length} queued • ${formatTrackTime(queue.duration * 1_000)} total`,
					}),
			},
			0,
		);

		await reply(interaction, page);
	},
});
