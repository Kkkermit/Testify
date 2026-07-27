import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds";
import { requireQueue } from "@lib/musicGuards";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "volume",
	description: "Sets the playback volume.",
	category: "music",
	aliases: ["vol"],
	guildOnly: true,
	options: [
		{
			name: "percent",
			description: "Volume from 0 to 150.",
			type: "integer",
			required: true,
			min: 0,
			max: 150,
		},
	],

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const percent = Math.min(150, Math.max(0, interaction.options.getInteger("percent", true)));

		queue.setVolume(percent);
		await reply(interaction, {
			embeds: [embed({ category: "music", description: `${theme.music.volume} Volume set to **${percent}%**.` })],
		});
	},
});
