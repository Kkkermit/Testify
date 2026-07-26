import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

export default defineCommand({
	name: "volume",
	description: "Sets the playback volume.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["vol"],
	guildOnly: true,
	options: [
		{
			name: "percent",
			description: "Volume from 0 to 150.",
			type: "integer",
			required: true,
			minValue: 0,
			maxValue: 150,
		},
	],

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const percent = Math.min(150, Math.max(0, ctx.options.getInteger("percent", true)));

		queue.setVolume(percent);
		await ctx.reply({
			embeds: [
				embed({ category: Category.Music, description: `${theme.music.volume} Volume set to **${percent}%**.` }),
			],
		});
	},
});
