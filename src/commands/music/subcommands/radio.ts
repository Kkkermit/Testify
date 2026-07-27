import { PermissionFlagsBits } from "discord.js";
import { theme } from "@config/theme";
import { defineCommand, inTextChannel } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds";
import { requireVoice } from "@lib/musicGuards";
import { reply } from "@lib/reply";

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
	category: "music",
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

	async run(interaction, client) {
		const { distube, voiceChannel, member } = requireVoice(interaction, client);
		const name = interaction.options.getString("station", true);
		const station = STATIONS.find((candidate) => candidate.name === name);
		if (!station) throw new UserFacingError("That station is not available.");

		await reply(interaction, {
			embeds: [embed({ category: "music", description: `${theme.music.play} Tuning in to **${station.name}**…` })],
		});

		await distube.play(voiceChannel, station.value, { member, textChannel: inTextChannel(interaction) });
	},
});
