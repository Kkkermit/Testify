import { PermissionFlagsBits } from "discord.js";
import { asMember, defineCommand, inGuild } from "@core/command";
import {
	CHOICE_MAX,
	choicesFor,
	interactionAge,
	musicBinaries,
	queueRequest,
	requestedQuery,
	resolveQuery,
	resolveTracks,
	SEARCH_RESULTS,
	searchBudget,
	shouldSearch,
	showPanel,
	stillOpen,
	Suggester,
	voiceChannelOf,
} from "@lib/music";

/** Autocomplete fires on every keystroke, so a typed title must not become a search per letter. */
const suggestions = new Suggester();

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
		const receivedAt = Date.now();
		const age = (): number => interactionAge(interaction.createdTimestamp, receivedAt);
		const typed = interaction.options.getFocused();

		const query = resolveQuery(typed);
		// A pasted link needs no lookup, and offering one row makes it obvious the paste was understood.
		if (query?.kind === "url") {
			// A link Discord would refuse as a value is worse than no row at all: picking a cut-off one plays nothing.
			await interaction.respond(typed.length > CHOICE_MAX ? [] : [{ name: "Play this link", value: typed }]);
			return;
		}

		if (!shouldSearch(typed)) {
			await interaction.respond([]);
			return;
		}

		const choices = await suggestions.suggest(
			typed,
			async () => {
				const found = await resolveTracks(
					{ kind: "search", terms: typed, source: query?.source ?? "youtube" },
					interaction.user.id,
					musicBinaries(client),
					{ flat: true },
				);

				return choicesFor(found.slice(0, SEARCH_RESULTS));
			},
			searchBudget(age()),
		);

		if (!stillOpen(age())) return;

		await interaction.respond(choices);
	},
});
