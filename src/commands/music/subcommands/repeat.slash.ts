import { RepeatMode } from "distube";
import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds.util";
import { requireQueue } from "@lib/musicGuards.util";
import { reply } from "@lib/reply.util";

const MODES: Record<string, RepeatMode> = {
	off: RepeatMode.DISABLED,
	track: RepeatMode.SONG,
	queue: RepeatMode.QUEUE,
};

export default defineCommand({
	name: "repeat",
	description: "Changes the loop mode.",
	category: "music",
	guildOnly: true,
	options: [
		{
			name: "mode",
			description: "What to loop.",
			type: "string",
			required: true,
			choices: [
				{ name: "off", value: "off" },
				{ name: "track", value: "track" },
				{ name: "queue", value: "queue" },
			],
		},
	],

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const requested = interaction.options.getString("mode", true).toLowerCase();
		const mode = MODES[requested] ?? RepeatMode.DISABLED;

		queue.setRepeatMode(mode);
		await reply(interaction, {
			embeds: [
				embed({
					category: "music",
					description: `${theme.music.repeat} Loop mode set to **${requested}**.`,
				}),
			],
		});
	},
});
