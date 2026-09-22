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
import { type Guild, type VoiceBasedChannel } from "discord.js";
import { type Logger } from "@core/logger";
import { type ContainerMessage } from "@lib/containers.util";
import { type MusicBinaries } from "@lib/musicBinaries.util";
import { clampVolume, DEFAULT_VOLUME, planStream, type StreamShape } from "@lib/musicFormat.util";
import { musicPanel } from "@lib/musicPanel.util";
import {
	currentTrack,
	decideOnIdle,
	EMPTY_QUEUE,
	type LoopMode,
	type QueueState,
	type Track,
} from "@lib/musicQueue.util";
import { describeTrack, type OpenStream, openStream } from "@lib/musicSource.util";

/** One guild's voice connection, player and queue, and the rules for moving between tracks. */

const READY_TIMEOUT_MS = 20_000;

/** Long enough to survive a region change, short enough that a real disconnect is not held open. */
const RECONNECT_GRACE_MS = 5_000;

/** How long an idle player keeps the channel before the bot leaves on its own. */
export const LEAVE_AFTER_IDLE_MS = 120_000;

/**
 * How often the "now playing" message is rewritten while a track runs.
 *
 * Discord allows five message edits per five seconds in a channel, so one guild at this rate uses a fifth of
 * it — and the bar moves often enough to read as progress rather than as a frozen picture of it.
 */
export const PANEL_REFRESH_MS = 5_000;

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
	edit(payload: ContainerMessage): Promise<unknown>;
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
	#volume = DEFAULT_VOLUME;
	#offsetMs = 0;
	#reopening = false;
	#panel: PanelTarget | null = null;
	#ticker: NodeJS.Timeout | null = null;
	#leaveTimer: NodeJS.Timeout | null = null;
	#destroyed = false;

	constructor(guildId: string, binaries: MusicBinaries, logger: Logger) {
		this.guildId = guildId;
		this.#binaries = binaries;
		this.#logger = logger;

		this.#player.on(AudioPlayerStatus.Idle, () => void this.#onIdle());
		this.#player.on("error", (error) => {
			// Never fatal, and never the whole error: an `AudioPlayerError` carries the resource, which stringifies
			// to kilobytes of stream internals and buries the one line that says what broke.
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

	/**
	 * How far into the current track the player has actually got, which is what tells a stall from an ending.
	 *
	 * A stream re-opened part-way through starts counting from zero again, so the offset it was opened at has
	 * to be added back or a volume change would make every track look like it came apart.
	 */
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
		const filtered = this.canSetVolume && (this.#volume !== DEFAULT_VOLUME || seekMs > 0);

		this.queue = { ...this.queue, index };

		let failure: string | null = null;

		try {
			// Closing leaves the player idle for as long as yt-dlp takes to answer, which must not advance the queue.
			this.#reopening = true;
			this.#closeStream();

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
					onProblem: (reason) =>
						this.#logger.warn({ guildId: this.guildId, reason, track: track.url }, "[MUSIC] The downloader gave up."),
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
			this.#emit({ kind: "failed", track, reason: failure });
			await this.#advancePast();
			return;
		}

		this.#startTicker();
		this.#emit({ kind: "track", track });
		void this.refreshPanel();
	}

	async #onIdle(): Promise<void> {
		// A stream being swapped out under the player is not the track ending.
		if (this.#destroyed || this.#reopening) return;

		const track = currentTrack(this.queue);
		const decision = decideOnIdle({
			state: this.queue,
			playedMs: this.playedMs,
			expectedMs: track?.durationMs ?? null,
			attempts: this.#attempts,
			stopping: this.#stopping,
			skipped: this.#skipped,
		});

		const resumeAt = this.#offsetMs;
		this.#closeStream();

		if (decision.action === "retry" && track !== null) {
			this.#attempts = decision.attempt;
			this.#emit({ kind: "retrying", track, attempt: decision.attempt });
			await this.play(this.queue.index, { seekMs: resumeAt });
			return;
		}

		this.#attempts = 0;

		if (decision.action === "play") {
			await this.play(decision.index);
			return;
		}

		this.#stopping = false;
		this.#endQueue();
	}

	/**
	 * Moves past a track that could not be opened at all, without counting it as a break worth retrying.
	 *
	 * Once every track has been tried the queue ends, because a looping queue of broken links would otherwise
	 * walk itself for ever.
	 */
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
		this.queue = { ...this.queue, index: this.queue.tracks.length };
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

	/**
	 * Sets the level, and re-opens the current track where it had got to.
	 *
	 * The re-open is not awaited: a button has three seconds to answer and yt-dlp takes longer than that, so
	 * the panel shows the new level straight away and the audio catches up a moment later.
	 */
	setVolume(volume: number): number {
		this.#volume = clampVolume(volume);

		if (currentTrack(this.queue) !== null && (this.playing || this.paused)) {
			this.#playSoon(this.queue.index, { seekMs: this.playedMs });
		}

		return this.#volume;
	}

	/** Back one track, or to the start of this one when there is nothing before it. */
	previous(): void {
		if (currentTrack(this.queue) === null) return;

		this.#playSoon(Math.max(0, this.queue.index - 1));
	}

	/**
	 * Starts a track without waiting for it.
	 *
	 * `play` marks itself as re-opening before it yields, so the player falling idle in the meantime cannot be
	 * mistaken for the track ending — and the caller keeps the three seconds Discord gives it to answer.
	 */
	#playSoon(index: number, options: { seekMs?: number } = {}): void {
		void this.play(index, options).catch((error: unknown) => {
			this.#logger.warn({ err: error, guildId: this.guildId }, "[MUSIC] Could not start a track.");
		});
	}

	render(userId: string, note?: string, page = 0): ContainerMessage {
		return musicPanel(
			{
				queue: this.queue,
				playedMs: this.playedMs,
				paused: this.paused,
				volume: this.#volume,
				canSetVolume: this.canSetVolume,
				page,
				note,
			},
			userId,
		);
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
			await panel.edit(this.render(panel.userId, undefined, panel.page));
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

export function activeSessionCount(): number {
	return sessions.size;
}

/** Called from shutdown, so a restart does not leave the bot sitting silently in voice channels. */
export function destroyAllSessions(): void {
	for (const session of [...sessions.values()]) session.destroy();
}
