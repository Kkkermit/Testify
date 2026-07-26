import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { Namespace } from "../../../core/customId";
import { buildPage } from "../../../ui/pagination";
import { embed } from "../../../ui/embeds";
import { formatTrackTime, truncate } from "../../../ui/format";
import { requireQueue } from "../services/musicGuards";

const PAGE_SIZE = 10;

export default defineCommand({
	name: "queue",
	description: "Shows the current queue.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["q"],
	guildOnly: true,

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const [current, ...upcoming] = queue.songs;

		const page = buildPage(
			{
				items: upcoming,
				pageSize: PAGE_SIZE,
				namespace: Namespace.Music,
				ownerId: ctx.user.id,
				render: (items, index) =>
					embed({
						category: Category.Music,
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

		await ctx.reply(page);
	},
});
