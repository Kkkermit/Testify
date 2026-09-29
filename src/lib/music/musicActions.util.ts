import { type AutocompleteInteraction, type Guild, type GuildMember, type VoiceBasedChannel } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type CommandInput } from "@core/command";
import { UserFacingError } from "@core/errors";
import { reply } from "@lib/discord/reply.util";
import { CHOICE_MAX, SEARCH_RESULTS } from "@lib/music/music.constants";
import { type MusicBinaries, type MusicSource, type Query, type Track } from "@lib/music/music.types";
import { findBinaries } from "@lib/music/musicBinaries.util";
import { isPlaylistUrl, resolveQuery } from "@lib/music/musicQuery.util";
import { addTracks } from "@lib/music/musicQueue.util";
import {
	type Choice,
	choicesFor,
	interactionAge,
	interleave,
	Keystrokes,
	searchBudget,
	shouldSearch,
	stillOpen,
	Suggester,
} from "@lib/music/musicSearch.util";
import { findSession, type MusicSession, sessionFor } from "@lib/music/musicSession.util";
import { MusicProblemError, resolveTracks } from "@lib/music/musicSource.util";
import { allowsSource, fallsBackToSoundCloud, readMusicSources, withinSources } from "@lib/music/musicSources.util";
import { type MusicSourceChoice } from "@testify/shared";

/** What `/play`, the `/music` subcommands and the panel buttons all need, written once. */

let cached: MusicBinaries | null = null;

/** Memoised because locating a binary runs it, and doing that per command would be absurd. */
export function musicBinaries(client: TestifyClient): MusicBinaries {
	cached ??= findBinaries(client.env);

	return cached;
}

/** The voice channel the person is in, or advice on what to do about not being in one. */
export function voiceChannelOf(member: GuildMember): VoiceBasedChannel {
	const channel = member.voice.channel;
	if (channel === null) throw new UserFacingError("Join a voice channel first, then try again.");

	return channel;
}

/** Refuses a control aimed at somebody else's session, which is how two channels stay independent. */
export function sameChannelAs(session: MusicSession, member: GuildMember): void {
	const listening = session.channelId;
	if (listening === null) return;

	if (member.voice.channelId !== listening) {
		throw new UserFacingError("You need to be in the voice channel I am playing in.");
	}
}

/** What somebody typed as a song, refused before anything slow happens so the refusal can be the first reply. */
export function requestedQuery(raw: string): Query {
	const query = resolveQuery(raw);
	if (query === null) throw new UserFacingError("Say what to play — a link, or a few words to search for.");
	if (query.source === "spotify") {
		throw new UserFacingError(
			"Spotify streams are DRM-protected, so nothing can play them. Search for the track by name instead.",
		);
	}

	return query;
}

export interface TrackRequest {
	guild: Guild;
	client: TestifyClient;
	channel: VoiceBasedChannel;
	query: Query;
	requestedBy: string;
	next: boolean;
	textChannelId: string | null;
}

function warnHost(request: TrackRequest, binaries: MusicBinaries): void {
	request.client.logger.warn(
		binaries.cookies === null || binaries.cookies === undefined
			? "[MUSIC] YouTube asked this host to prove it is not a bot. Give yt-dlp YouTube cookies with MUSIC_YTDLP_COOKIES; .env.example says how."
			: "[MUSIC] YouTube asked this host to prove it is not a bot even with cookies. They have probably expired; export fresh ones into MUSIC_YTDLP_COOKIES.",
	);
}

/** Resolves the query, moving a plain search to SoundCloud when YouTube refuses the host and the owner allows both. */
async function findTracks(
	request: TrackRequest,
	query: Query,
	sources: MusicSourceChoice,
): Promise<{ found: Track[]; fellBack: boolean }> {
	const binaries = musicBinaries(request.client);
	// Only the first search result is played, so asking for more is requests YouTube can hold against the host.
	const ask = (asked: Query): Promise<Track[]> =>
		resolveTracks(asked, request.requestedBy, binaries, {
			flat: asked.kind === "url" && isPlaylistUrl(asked.url),
			...(asked.kind === "search" ? { results: 1 } : {}),
		});

	try {
		const found = await ask(query);
		if (found.length > 0 || !fallsBackToSoundCloud(query, sources)) return { found, fellBack: false };
	} catch (error) {
		if (!(error instanceof MusicProblemError) || error.problem.kind === "unavailable") throw error;
		if (error.problem.kind === "bot-check") warnHost(request, binaries);

		if (!fallsBackToSoundCloud(query, sources)) {
			throw query.source === "youtube" && allowsSource(sources, "soundcloud")
				? new MusicProblemError(error.problem, "Put `sc:` before your search to use SoundCloud.")
				: error;
		}
	}

	return { found: await ask({ ...query, source: "soundcloud" }), fellBack: true };
}

/** Finds the tracks and adds them, starting the first at once when nothing is playing; `/play` and Add to queue share it. */
export async function queueRequest(request: TrackRequest): Promise<{ session: MusicSession; note: string }> {
	const sources = await readMusicSources();
	const query = withinSources(request.query, sources);
	const session = openSession(request.guild, request.client);
	const { found, fellBack } = await findTracks(request, query, sources);

	if (found.length === 0) throw new UserFacingError("Nothing turned up for that.");

	// A search offers several; only the first is wanted unless a playlist was asked for by name.
	const tracks = query.kind === "search" ? found.slice(0, 1) : found;
	const added = addTracks(session.queue, tracks, { next: request.next, idle: !session.active });

	session.queue = added.state;
	session.textChannelId = request.textChannelId;

	await session.connect(request.channel);
	if (added.start !== null) await session.play(added.start);

	const title = tracks[0]?.title ?? "a track";
	const note =
		tracks.length > 1
			? `Added **${String(tracks.length)}** tracks.`
			: added.start === null
				? `Added **${title}** to the queue.`
				: `Playing **${title}**.`;

	return { session, note: fellBack ? `${note} YouTube would not answer, so it came from SoundCloud.` : note };
}

/** Which services a search is put to: both at once for a plain search while the owner allows both. */
export function searchTargets(query: Query, sources: MusicSourceChoice): MusicSource[] {
	return fallsBackToSoundCloud(query, sources) ? ["youtube", "soundcloud"] : [query.source];
}

/** Asks every target, keeping what answered; only when none did is it a failure, so the next keystroke can try again. */
async function searchAll(
	query: Query,
	targets: MusicSource[],
	requestedBy: string,
	binaries: MusicBinaries,
): Promise<Choice[]> {
	const answers = await Promise.allSettled(
		targets.map((source) => resolveTracks({ ...query, source }, requestedBy, binaries, { flat: true })),
	);

	const lists = answers.map((answer) => (answer.status === "fulfilled" ? answer.value.slice(0, SEARCH_RESULTS) : []));
	const refused = answers.find((answer) => answer.status === "rejected");
	if (refused !== undefined && lists.every((list) => list.length === 0)) throw refused.reason;

	return choicesFor(interleave(lists), { labelled: targets.length > 1 });
}

/** `/play`'s typeahead, with a cache per set of services so a change of the owner's choice cannot offer the other's songs. */
export class TrackTypeahead {
	readonly #suggesters = new Map<string, Suggester>();
	readonly #keystrokes = new Keystrokes();

	/** What `/play` would play for this text and where it would search, or null for anything it would refuse. */
	async queryFor(typed: string): Promise<{ query: Query; targets: MusicSource[] } | null> {
		const sources = await readMusicSources();

		try {
			const query = withinSources(requestedQuery(typed), sources);
			return { query, targets: searchTargets(query, sources) };
		} catch (error) {
			if (error instanceof UserFacingError) return null;
			throw error;
		}
	}

	async answer(interaction: AutocompleteInteraction, client: TestifyClient): Promise<void> {
		const receivedAt = Date.now();
		const age = (): number => interactionAge(interaction.createdTimestamp, receivedAt);
		const typed = interaction.options.getFocused();

		if (resolveQuery(typed)?.kind !== "url" && !shouldSearch(typed)) {
			await interaction.respond([]);
			return;
		}

		const planned = await this.queryFor(typed);
		if (planned === null) {
			await interaction.respond([]);
			return;
		}

		const { query, targets } = planned;

		// A pasted link needs no lookup, and offering one row makes it obvious the paste was understood.
		if (query.kind === "url") {
			// A link Discord would refuse as a value is worse than no row at all: picking a cut-off one plays nothing.
			await interaction.respond(typed.length > CHOICE_MAX ? [] : [{ name: "Play this link", value: typed }]);
			return;
		}

		const typist = `${interaction.guildId ?? "dm"}:${interaction.user.id}`;
		this.#keystrokes.begin(typist, interaction.id);

		try {
			const choices = await this.#suggesterFor(targets.join("+")).suggest(
				typed,
				() => searchAll(query, targets, interaction.user.id, musicBinaries(client)),
				searchBudget(age()),
			);

			if (!stillOpen(age()) || !this.#keystrokes.isLatest(typist, interaction.id)) return;

			await interaction.respond(choices);
		} finally {
			this.#keystrokes.end(typist, interaction.id);
		}
	}

	#suggesterFor(key: string): Suggester {
		const existing = this.#suggesters.get(key);
		if (existing !== undefined) return existing;

		const created = new Suggester();
		this.#suggesters.set(key, created);
		return created;
	}
}

export function openSession(guild: Guild, client: TestifyClient): MusicSession {
	return sessionFor(guild, musicBinaries(client), client.logger);
}

export function requireSession(guild: Guild): MusicSession {
	const session = findSession(guild.id);
	if (session === null) throw new UserFacingError("Nothing is playing. Use `/play` to start something.");

	return session;
}

/** The one refusal of a volume change, since only FFmpeg can re-encode. */
export function requireVolumeControl(session: MusicSession): void {
	if (session.canSetVolume) return;

	throw new UserFacingError(
		"Changing the volume needs FFmpeg, which is not installed on this host. Run `npm run music:setup` to check.",
	);
}

/**
 * Answers with the panel and keeps it live, editing through the channel because an interaction token dies after fifteen
 * minutes.
 */
export async function showPanel(
	interaction: CommandInput,
	session: MusicSession,
	note?: string,
	page = 0,
): Promise<void> {
	const { payload, cardFor } = await session.panelMessage(interaction.user.id, note, page);
	await reply(interaction, payload);
	await watchReply(interaction, session, page, cardFor);
}

async function watchReply(
	interaction: CommandInput,
	session: MusicSession,
	page: number,
	cardFor: string | null,
): Promise<void> {
	const channel = interaction.channel;
	if (channel === null || !("messages" in channel)) return;

	try {
		const message = await interaction.fetchReply();
		session.rememberCard(cardFor, message);
		session.watchPanel({
			userId: interaction.user.id,
			page,
			edit: async (payload) => channel.messages.edit(message.id, payload),
		});
	} catch (error) {
		// A panel that cannot be found again is simply not live; the reply the person can see is unaffected.
		session.logger.debug({ err: error, guildId: session.guildId }, "[MUSIC] Could not attach the live panel.");
	}
}
