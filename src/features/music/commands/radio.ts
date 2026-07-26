import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireTextChannel } from "../../../core/guards";
import { embed } from "../../../ui/embeds";
import { requireVoice } from "../services/musicGuards";

/**
 * Public radio streams. The previous implementation embedded a session-bound
 * lofi URL with a baked-in timestamp and UUID that had already expired.
 */
const STATIONS = [
	{ name: "Lofi hip hop", value: "https://usa9.fastcast4u.com/proxy/jamsplus?mp=/1" },
	{ name: "Chillhop", value: "http://stream.zeno.fm/0r0xa792kwzuv" },
	{ name: "Classical", value: "https://live.musopen.org:8085/streamvbr0" },
	{ name: "Jazz", value: "http://stream.zeno.fm/0r0xa792kwzuv" },
	{ name: "Synthwave", value: "http://stream.zeno.fm/f3wvbbqmdg8uv" },
];

export default defineCommand({
	name: "radio",
	description: "Plays a continuous radio station.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [
		{
			name: "station",
			description: "Which station to play.",
			type: "string",
			required: true,
			choices: STATIONS.map((station) => ({ name: station.name, value: station.name })),
		},
	],

	async execute(ctx) {
		const { distube, voiceChannel, member } = requireVoice(ctx);
		const name = ctx.options.getString("station", true);
		const station = STATIONS.find((candidate) => candidate.name === name);
		if (!station) throw new UserFacingError("That station is not available.");

		await ctx.reply({
			embeds: [
				embed({ category: Category.Music, description: `${theme.music.play} Tuning in to **${station.name}**…` }),
			],
		});

		await distube.play(voiceChannel, station.value, { member, textChannel: requireTextChannel(ctx) });
	},
});
