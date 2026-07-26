import { RepeatMode } from "distube";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

const MODES: Record<string, RepeatMode> = {
	off: RepeatMode.DISABLED,
	track: RepeatMode.SONG,
	queue: RepeatMode.QUEUE,
};

export default defineCommand({
	name: "repeat",
	description: "Changes the loop mode.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["loop"],
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

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const requested = ctx.options.getString("mode", true).toLowerCase();
		const mode = MODES[requested] ?? RepeatMode.DISABLED;

		queue.setRepeatMode(mode);
		await ctx.reply({
			embeds: [
				embed({
					category: Category.Music,
					description: `${theme.music.repeat} Loop mode set to **${requested}**.`,
				}),
			],
		});
	},
});
