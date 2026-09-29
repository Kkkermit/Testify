import { PermissionFlagsBits } from "discord.js";
import { asMember, defineCommand, inGuild } from "@core/command";
import { queueRequest, requestedQuery, showPanel, TrackTypeahead, voiceChannelOf } from "@lib/music";

/** Autocomplete fires on every keystroke, so a typed title must not become a search per letter. */
const typeahead = new TrackTypeahead();

export default defineCommand({
	name: "play",
	description: "Plays a track, or adds it to the queue.",
	category: "music",
	aliases: ["p"],
	guildOnly: true,
	botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
	options: [
		{
			name: "query",
			description: "A link to play, or something to search for.",
			type: "string",
			required: true,
			autocomplete: true,
			maxLength: 500,
		},
		{ name: "next", description: "Put it straight after the current track.", type: "boolean" },
	],

	async run(interaction, client) {
		const guild = inGuild(interaction);
		const channel = voiceChannelOf(asMember(interaction));
		const query = requestedQuery(interaction.options.getString("query", true));

		// Resolving spawns yt-dlp and can take seconds, which is well past Discord's reply window.
		await interaction.deferReply();

		const { session, note } = await queueRequest({
			guild,
			client,
			channel,
			query,
			requestedBy: interaction.user.id,
			next: interaction.options.getBoolean("next") === true,
			textChannelId: interaction.channel?.id ?? null,
		});

		await showPanel(interaction, session, note);
	},

	async autocomplete(interaction, client) {
		await typeahead.answer(interaction, client);
	},
});
