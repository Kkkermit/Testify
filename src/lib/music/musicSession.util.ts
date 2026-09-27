import {
	AudioPlayerStatus,
	type AudioResource,
	createAudioPlayer,
	createAudioResource,
	entersState,
	joinVoiceChannel,
	NoSubscriberBehavior,
	StreamType,
	type VoiceConnection,
	VoiceConnectionStatus,
} from "@discordjs/voice";
import { AttachmentBuilder, type Guild, type VoiceBasedChannel } from "discord.js";
import { type Logger } from "@core/logger";
import { fetchArtwork, MUSIC_CARD_NAME, renderMusicCard } from "@lib/canvas/musicCard.util";
import { type ContainerMessageWithFiles } from "@lib/discord/discord.types";
import {
	DEFAULT_VOLUME,
	EMPTY_QUEUE,
	MAX_TRACK_ATTEMPTS,
	RETRIES_AFTER,
	UNITY_VOLUME,
} from "@lib/music/music.constants";
import {
	type MusicBinaries,
	type StreamShape,
	type DownloadProblem,
	type LoopMode,
	type QueueState,
	type Track,
	type OpenStream,
} from "@lib/music/music.types";
import { clampVolume, planStream } from "@lib/music/musicFormat.util";
import { musicPanel, type PanelState } from "@lib/music/musicPanel.util";
import { classifyProblem } from "@lib/music/musicProblem.util";
import { currentTrack, decideOnIdle, endedEarly, finished } from "@lib/music/musicQueue.util";
import { describeTrack, forgetDescription, openStream } from "@lib/music/musicSource.util";

/** One guild's voice connection, player and queue, and the rules for moving between tracks. */

const READY_TIMEOUT_MS = 20_000;

/** Long enough to survive a region change, short enough that a real disconnect is not held open. */
const RECONNECT_GRACE_MS = 5_000;

/** How long an idle player keeps the channel before the bot leaves on its own. */
const LEAVE_AFTER_IDLE_MS = 120_000;

/** Discord allows five edits per five seconds in a channel, so this uses a fifth. */
export const PANEL_REFRESH_MS = 5_000;

/** How long a "skipped because…" line stays on the panel, which is long enough to be read after the next refresh. */
export const NOTICE_MS = 60_000;

const STREAM_TYPES: Record<StreamShape, StreamType> = {
	"webm-opus": StreamType.WebmOpus,
	"ogg-opus": StreamType.OggOpus,
	transcode: StreamType.OggOpus,
};

export type SessionEvent =
	| { kind: "track"; track: Track }
	| { kind: "queue-ended" }
	| { kind: "failed"; track: Track; reason: string }
	| { kind: "retrying"; track: Track; attempt: number };

export type SessionListener = (event: SessionEvent) => void;

/** The message the live panel rewrites, narrowed to the one call it makes so a test needs no Discord. */
export interface PanelTarget {
	userId: string;
	page: number;
	/** Resolves to the edited message, which is where an uploaded card's address is read from. */
	edit(payload: ContainerMessageWithFiles): Promise<unknown>;
}

/** A panel to send, and the track whose card it uploads, so the sender can say where Discord put it. */
export interface PanelMessage {
	payload: ContainerMessageWithFiles;
	cardFor: string | null;
}

/** The current track's drawn card, and its address once a message has uploaded it. */
interface Card {
	trackUrl: string;
	image: Promise<Buffer | null>;
	uploaded: string | null;
}

function uploadedUrl(message: unknown, name: string): string | null {
	if (typeof message !== "object" || message === null || !("attachments" in message)) return null;

	const { attachments } = message as {
		attachments: { find(match: (attachment: { name: string }) => boolean): { url: string } | undefined };
	};

	return attachments.find((attachment) => attachment.name === name)?.url ?? null;
}

export class MusicSession {
	readonly guildId: string;
	queue: QueueState = EMPTY_QUEUE;
	/** The channel replies about this session go to, so a track change can announce itself. */
	textChannelId: string | null = null;

	readonly #player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
	readonly #binaries: MusicBinaries;
	readonly #logger: Logger;
	readonly #listeners = new Set<SessionListener>();

	#connection: VoiceConnection | null = null;
	#stream: OpenStream | null = null;
	#resource: AudioResource | null = null;
	#attempts = 0;
	#stopping = false;
	#skipped = false;
	#failures = 0;
	/** What the downloader of the current stream said before it died, when it said something that matters. */
	#problem: DownloadProblem | null = null;
	#problemReason: string | null = null;
	/** Bumped per stream, so a stream closed on purpose cannot report into the one that replaced it. */
	#generation = 0;
	#notice: { text: string; at: number } | null = null;
	#volume: number;
	#offsetMs = 0;
	#reopening = false;
	#panel: PanelTarget | null = null;
	#ticker: NodeJS.Timeout | null = null;
	#leaveTimer: NodeJS.Timeout | null = null;
	#destroyed = false;
	#card: Card | null = null;

	constructor(guildId: string, binaries: MusicBinaries, logger: Logger) {
		this.guildId = guildId;
		this.#binaries = binaries;
		this.#logger = logger;
		this.#volume = binaries.ffmpeg === null ? UNITY_VOLUME : DEFAULT_VOLUME;

		this.#player.on(AudioPlayerStatus.Idle, () => void this.#onIdle());
		this.#player.on("error", (error) => {
			// Never fatal, and never the whole error, which stringifies kilobytes of stream internals.
			this.#logger.warn(
				{ guildId, reason: error.message, track: currentTrack(this.queue)?.url ?? null },
				"[MUSIC] The stream came apart. Treating it as a break.",
			);
		});
	}

	on(listener: SessionListener): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	#emit(event: SessionEvent): void {
		for (const listener of this.#listeners) {
			try {
				listener(event);
			} catch (error) {
				this.#logger.warn({ err: error, guildId: this.guildId }, "[MUSIC] A session listener threw.");
			}
		}
	}

	get playing(): boolean {
		return this.#player.state.status === AudioPlayerStatus.Playing;
	}

	get paused(): boolean {
		return this.#player.state.status === AudioPlayerStatus.Paused;
	}

	/** Playing, paused, or opening a track; a queue that has run out is not, even with its last track still listed. */
	get active(): boolean {
		return this.#reopening || this.#player.state.status !== AudioPlayerStatus.Idle;
	}

	get channelId(): string | null {
		return this.#connection?.joinConfig.channelId ?? null;
	}

	get volume(): number {
		return this.#volume;
	}

	/** The session owns the guild's player, so anything wiring a panel to it reports through the same log. */
	get logger(): Logger {
		return this.#logger;
	}

	/** Changing the level means re-encoding, and only FFmpeg can do that. */
	get canSetVolume(): boolean {
		return this.#binaries.ffmpeg !== null;
	}

	/** How far into the track the player has got, including the offset a re-opened stream started at. */
	get playedMs(): number {
		return this.#offsetMs + (this.#resource?.playbackDuration ?? 0);
	}

	async connect(channel: VoiceBasedChannel): Promise<void> {
		if (this.#connection !== null && this.channelId === channel.id) return;

		this.#connection?.destroy();
		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,
			selfDeaf: true,
		});

		// A region change arrives as a disconnect and recovers on its own; anything longer is a real departure.
		connection.on(VoiceConnectionStatus.Disconnected, () => {
			void Promise.race([
				entersState(connection, VoiceConnectionStatus.Signalling, RECONNECT_GRACE_MS),
				entersState(connection, VoiceConnectionStatus.Connecting, RECONNECT_GRACE_MS),
			]).catch(() => this.destroy());
		});

		this.#connection = connection;
		connection.subscribe(this.#player);

		try {
			await entersState(connection, VoiceConnectionStatus.Ready, READY_TIMEOUT_MS);
		} catch (error) {
			this.destroy();
			throw error;
		}
	}

	/** Starts the track at `index`, replacing whatever was playing. */
	async play(index: number, options: { seekMs?: number } = {}): Promise<void> {
		const track = this.queue.tracks[index];
		if (track === undefined) return;

		const seekMs = this.canSetVolume ? Math.max(0, Math.round(options.seekMs ?? 0)) : 0;
		const filtered = this.canSetVolume && (this.#volume !== UNITY_VOLUME || seekMs > 0);

		this.queue = { ...this.queue, index };

		let failure: string | null = null;

		try {
			// Closing leaves the player idle for as long as yt-dlp takes to answer, which must not advance the queue.
			this.#reopening = true;
			this.#closeStream();

			this.#problem = null;
			this.#problemReason = null;
			const generation = ++this.#generation;

			const info = await describeTrack(track.url, this.#binaries);
			const plan = info === null ? null : planStream(info.formats ?? [], { ffmpeg: this.canSetVolume, filtered });

			if (plan === null) {
				failure = this.canSetVolume
					? "no playable audio was offered for it"
					: "it is not offered in a format Discord can play, and FFmpeg is not installed";
			} else {
				const stream = openStream(track.url, plan, this.#binaries, {
					volume: this.#volume,
					seekMs,
					onProblem: (reason) => this.#onProblem(generation, track, reason),
				});
				const resource = createAudioResource(stream.stream, { inputType: STREAM_TYPES[plan.shape] });

				this.#stream = stream;
				this.#resource = resource;
				this.#offsetMs = seekMs;
				this.#skipped = false;
				this.#failures = 0;
				this.#clearLeaveTimer();
				this.#player.play(resource);
			}
		} catch (error) {
			// One track that will not open is not the end of the queue, so it is reported and stepped over.
			this.#logger.warn({ err: error, guildId: this.guildId }, "[MUSIC] A track could not be opened. Moving on.");
			failure = "it could not be opened";
		} finally {
			this.#reopening = false;
		}

		if (failure !== null) {
			this.#notify(`Skipped **${track.title}** — ${failure}.`);
			this.#emit({ kind: "failed", track, reason: failure });
			await this.#advancePast();
			return;
		}

		this.#cardFor(track);
		this.#startTicker();
		this.#emit({ kind: "track", track });
		void this.refreshPanel();
	}

	async #onIdle(): Promise<void> {
		// A stream being swapped out under the player is not the track ending.
		if (this.#destroyed || this.#reopening) return;

		const track = currentTrack(this.queue);
		const problem = this.#problem;
		const brokeEarly = !this.#skipped && !this.#stopping && endedEarly(this.playedMs, track?.durationMs ?? null);
		const decision = decideOnIdle({
			state: this.queue,
			playedMs: this.playedMs,
			expectedMs: track?.durationMs ?? null,
			attempts: this.#attempts,
			stopping: this.#stopping,
			skipped: this.#skipped,
			attemptsAllowed: problem === null ? MAX_TRACK_ATTEMPTS : RETRIES_AFTER[problem.kind],
		});

		const resumeAt = this.#offsetMs;
		this.#closeStream();

		if (decision.action === "retry" && track !== null) {
			if (this.#problemReason !== null) {
				this.#logger.debug(
					{ guildId: this.guildId, reason: this.#problemReason, track: track.url, attempt: decision.attempt },
					"[MUSIC] The download stopped, so the track is being opened again.",
				);
			}
			this.#attempts = decision.attempt;
			this.#emit({ kind: "retrying", track, attempt: decision.attempt });
			await this.play(this.queue.index, { seekMs: resumeAt });
			return;
		}

		// Given up on: the panel is the only place anybody in the channel would find out why.
		if (brokeEarly && track !== null) {
			this.#warnGaveUp(track, problem);
			this.#notify(`Skipped **${track.title}** — ${problem?.advice ?? "the stream kept breaking."}`);
			this.#emit({ kind: "failed", track, reason: problem?.advice ?? "the stream kept breaking" });
		}

		this.#attempts = 0;

		if (decision.action === "play") {
			await this.play(decision.index);
			return;
		}

		this.#stopping = false;
		this.#endQueue();
	}

	#onProblem(generation: number, track: Track, reason: string): void {
		if (generation !== this.#generation) return;

		const problem = classifyProblem(reason);
		this.#problem = problem;
		this.#problemReason = reason;
		// A refused track is described afresh next time, in case what it was refused for has changed.
		if (problem !== null) forgetDescription(track.url, this.#binaries);
	}

	/** Only a track given up on is worth a warning; a 403 the fresh try gets past cost the listener nothing. */
	#warnGaveUp(track: Track, problem: DownloadProblem | null): void {
		if (this.#problemReason === null) return;

		this.#logger.warn(
			{
				guildId: this.guildId,
				reason: this.#problemReason,
				track: track.url,
				ytDlp: this.#binaries.ytDlpVersion ?? null,
			},
			problem === null ? "[MUSIC] The downloader gave up." : `[MUSIC] ${problem.advice.replaceAll("`", "")}`,
		);
	}

	#notify(text: string, now = Date.now()): void {
		this.#notice = { text, at: now };
	}

	/** The last thing that went wrong, while it is still recent enough to be the thing somebody is wondering about. */
	notice(now = Date.now()): string | undefined {
		if (this.#notice === null || now - this.#notice.at > NOTICE_MS) return undefined;

		return this.#notice.text;
	}

	/** Moves past a track that would not open; once every track has been tried the queue ends rather than looping. */
	async #advancePast(): Promise<void> {
		this.#skipped = true;
		this.#attempts = 0;
		this.#failures += 1;

		if (this.#failures > this.queue.tracks.length) {
			this.#failures = 0;
			this.#endQueue();
			return;
		}

		await this.#onIdle();
	}

	#endQueue(): void {
		this.queue = finished(this.queue);
		this.#stopTicker();
		this.#emit({ kind: "queue-ended" });
		void this.refreshPanel();
		this.#startLeaveTimer();
	}

	skip(): void {
		this.#skipped = true;
		this.#player.stop(true);
	}

	stop(): void {
		this.#stopping = true;
		this.queue = finished(this.queue);
		this.#player.stop(true);
	}

	pause(): boolean {
		return this.#player.pause(true);
	}

	resume(): boolean {
		return this.#player.unpause();
	}

	setLoop(loop: LoopMode): void {
		this.queue = { ...this.queue, loop };
	}

	/** Sets the level and re-opens the track where it was, unawaited because yt-dlp takes longer than a button may. */
	setVolume(volume: number): number {
		this.#volume = clampVolume(volume);

		if (currentTrack(this.queue) !== null && (this.playing || this.paused)) {
			this.#playSoon(this.queue.index, { seekMs: this.playedMs });
		}

		return this.#volume;
	}

	/** Back one track, or to the start of this one when there is nothing before it; after the end, the last one again. */
	previous(): void {
		const { tracks, index } = this.queue;
		if (tracks.length === 0) return;

		this.#playSoon(Math.max(0, Math.min(index, tracks.length) - 1));
	}

	/**
	 * Starts a track without waiting; `play` marks itself as re-opening first, so the idle in between is not an ending.
	 */
	#playSoon(index: number, options: { seekMs?: number } = {}): void {
		void this.play(index, options).catch((error: unknown) => {
			this.#logger.warn({ err: error, guildId: this.guildId }, "[MUSIC] Could not start a track.");
		});
	}

	/** Drawn once per track and started as the track starts, so a refresh rarely has to wait for it. */
	#cardFor(track: Track): Card {
		if (this.#card?.trackUrl !== track.url) {
			this.#card = { trackUrl: track.url, image: this.#drawCard(track), uploaded: null };
		}

		return this.#card;
	}

	async #drawCard(track: Track): Promise<Buffer | null> {
		try {
			return await renderMusicCard(track, await fetchArtwork(track.thumbnail));
		} catch (error) {
			// Without a card the panel falls back to the thumbnail beside the title, which is still a working player.
			this.#logger.debug({ err: error, guildId: this.guildId }, "[MUSIC] Could not draw the now-playing card.");
			return null;
		}
	}

	/**
	 * The panel for a message: the card is uploaded with the first message that shows a track and referred to by its
	 * address after that, so a refresh every few seconds never sends the picture again.
	 */
	async panelMessage(userId: string, note?: string, page = 0): Promise<PanelMessage> {
		const state: PanelState = {
			queue: this.queue,
			playedMs: this.playedMs,
			paused: this.paused,
			volume: this.#volume,
			canSetVolume: this.canSetVolume,
			page,
			note: note ?? this.notice(),
		};
		const track = currentTrack(this.queue);
		const plain: PanelMessage = { payload: { ...musicPanel(state, userId), attachments: [] }, cardFor: null };
		if (track === null) return plain;

		const card = this.#cardFor(track);
		if (card.uploaded !== null)
			return { payload: musicPanel({ ...state, card: card.uploaded }, userId), cardFor: null };

		const image = await card.image;
		if (image === null) return plain;

		return {
			payload: {
				...musicPanel({ ...state, card: `attachment://${MUSIC_CARD_NAME}` }, userId),
				files: [new AttachmentBuilder(image, { name: MUSIC_CARD_NAME })],
			},
			cardFor: track.url,
		};
	}

	/** Reads where Discord stored a card a message just uploaded, so later edits refer to it rather than send it again. */
	rememberCard(cardFor: string | null, message: unknown): void {
		if (cardFor === null || this.#card?.trackUrl !== cardFor) return;

		const url = uploadedUrl(message, MUSIC_CARD_NAME);
		if (url !== null) this.#card.uploaded = url;
	}

	/** Points the live panel at a message, so the progress bar keeps up with what is actually playing. */
	watchPanel(target: PanelTarget): void {
		this.#panel = target;
		if (this.playing) this.#startTicker();
	}

	async refreshPanel(): Promise<void> {
		const panel = this.#panel;
		if (panel === null) return;

		try {
			const { payload, cardFor } = await this.panelMessage(panel.userId, undefined, panel.page);
			this.rememberCard(cardFor, await panel.edit(payload));
		} catch (error) {
			// A deleted or unreachable message is the ordinary end of a panel, not something to keep retrying.
			this.#logger.debug({ err: error, guildId: this.guildId }, "[MUSIC] Dropped a panel that could not be edited.");
			this.#panel = null;
			this.#stopTicker();
		}
	}

	#startTicker(): void {
		if (this.#ticker !== null || this.#panel === null) return;

		this.#ticker = setInterval(() => {
			if (this.playing) void this.refreshPanel();
		}, PANEL_REFRESH_MS);
		this.#ticker.unref();
	}

	#stopTicker(): void {
		if (this.#ticker !== null) clearInterval(this.#ticker);
		this.#ticker = null;
	}

	#closeStream(): void {
		this.#stream?.close();
		this.#stream = null;
		this.#resource = null;
		this.#offsetMs = 0;
	}

	#clearLeaveTimer(): void {
		if (this.#leaveTimer !== null) clearTimeout(this.#leaveTimer);
		this.#leaveTimer = null;
	}

	#startLeaveTimer(): void {
		this.#clearLeaveTimer();
		this.#leaveTimer = setTimeout(() => this.destroy(), LEAVE_AFTER_IDLE_MS);
		this.#leaveTimer.unref();
	}

	destroy(): void {
		if (this.#destroyed) return;
		this.#destroyed = true;

		this.#clearLeaveTimer();
		this.#stopTicker();
		this.#closeStream();
		this.#player.stop(true);
		this.#connection?.destroy();
		this.#connection = null;
		this.#panel = null;
		this.#listeners.clear();
		sessions.delete(this.guildId);
	}
}

/** Live voice sessions, one per guild. Process state by necessity: a connection cannot live in a database. */
const sessions = new Map<string, MusicSession>();

export function sessionFor(guild: Guild, binaries: MusicBinaries, logger: Logger): MusicSession {
	const existing = sessions.get(guild.id);
	if (existing !== undefined) return existing;

	const created = new MusicSession(guild.id, binaries, logger);
	sessions.set(guild.id, created);

	return created;
}

export function findSession(guildId: string): MusicSession | null {
	return sessions.get(guildId) ?? null;
}

/** Called from shutdown, so a restart does not leave the bot sitting silently in voice channels. */
export function destroyAllSessions(): void {
	for (const session of [...sessions.values()]) session.destroy();
}
