import { PermissionFlagsBits } from "discord.js";
import { asMember, defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { musicBinaries, openSession, panelFor, voiceChannelOf } from "@lib/musicActions.util";
import { isPlaylistUrl, resolveQuery } from "@lib/musicQuery.util";
import { currentTrack, enqueue, enqueueNext } from "@lib/musicQueue.util";
import { choicesFor, literalChoice, MAX_CHOICES, SearchCache, shouldSearch } from "@lib/musicSearch.util";
import { resolveTracks, SEARCH_RESULTS } from "@lib/musicSource.util";

/** Autocomplete fires on every keystroke, so a typed title must not become a search per letter. */
const suggestions = new SearchCache();

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
		const raw = interaction.options.getString("query", true);

		const query = resolveQuery(raw);
		if (query === null) throw new UserFacingError("Say what to play — a link, or a few words to search for.");
		if (query.source === "spotify") {
			throw new UserFacingError(
				"Spotify streams are DRM-protected, so nothing can play them. Search for the track by name instead.",
			);
		}

		// Resolving spawns yt-dlp and can take seconds, which is well past Discord's reply window.
		await interaction.deferReply();

		const session = openSession(guild, client);
		const flat = query.kind === "url" && isPlaylistUrl(query.url);
		const found = await resolveTracks(query, interaction.user.id, musicBinaries(client), { flat });

		if (found.length === 0) throw new UserFacingError("Nothing turned up for that.");

		// A search offers several; only the first is wanted unless a playlist was asked for by name.
		const tracks = query.kind === "search" ? found.slice(0, 1) : found;
		const wasIdle = currentTrack(session.queue) === null;

		session.queue =
			interaction.options.getBoolean("next") === true
				? enqueueNext(session.queue, tracks)
				: enqueue(session.queue, tracks);
		session.textChannelId = interaction.channel?.id ?? null;

		await session.connect(channel);
		if (wasIdle) await session.play(session.queue.index < 0 ? 0 : session.queue.index);

		const note =
			tracks.length > 1 ? `Added **${String(tracks.length)}** tracks.` : `Added **${tracks[0]?.title ?? "a track"}**.`;

		await interaction.editReply(panelFor(session, interaction.user.id, note));
	},

	async autocomplete(interaction, client) {
		const typed = interaction.options.getFocused();

		const query = resolveQuery(typed);
		// A pasted link needs no lookup, and offering one row makes it obvious the paste was understood.
		if (query?.kind === "url") {
			await interaction.respond([{ name: "Play this link", value: typed.slice(0, 100) }]);
			return;
		}

		if (!shouldSearch(typed)) {
			await interaction.respond([]);
			return;
		}

		const cachedChoices = suggestions.get(typed);
		if (cachedChoices !== null) {
			await interaction.respond(cachedChoices.slice(0, MAX_CHOICES));
			return;
		}

		try {
			const found = await resolveTracks(
				{ kind: "search", terms: typed, source: query?.source ?? "youtube" },
				interaction.user.id,
				musicBinaries(client),
				{ flat: true },
			);
			const choices = choicesFor(found.slice(0, SEARCH_RESULTS));

			suggestions.set(typed, choices);
			await interaction.respond(choices.length === 0 ? [literalChoice(typed)] : choices);
		} catch {
			// A slow or broken search must still leave a way to press enter.
			await interaction.respond([literalChoice(typed)]);
		}
	},
});
