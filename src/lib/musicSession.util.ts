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
import { type MusicBinaries } from "@lib/musicBinaries.util";
import { planStream, type StreamShape } from "@lib/musicFormat.util";
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
	#leaveTimer: NodeJS.Timeout | null = null;
	#destroyed = false;

	constructor(guildId: string, binaries: MusicBinaries, logger: Logger) {
		this.guildId = guildId;
		this.#binaries = binaries;
		this.#logger = logger;

		this.#player.on(AudioPlayerStatus.Idle, () => void this.#onIdle());
		this.#player.on("error", (error) => {
			// Never fatal: an unhandled player error would take the whole bot down with it.
			this.#logger.warn({ err: error, guildId }, "[MUSIC] The player reported an error. Treating it as a break.");
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

	/** How far into the current track the player has actually got, which is what tells a stall from an ending. */
	get playedMs(): number {
		return this.#resource?.playbackDuration ?? 0;
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
	async play(index: number): Promise<void> {
		const track = this.queue.tracks[index];
		if (track === undefined) return;

		this.queue = { ...this.queue, index };
		this.#closeStream();

		const info = await describeTrack(track.url, this.#binaries);
		const plan = info === null ? null : planStream(info.formats ?? [], { ffmpeg: this.#binaries.ffmpeg !== null });

		if (plan === null) {
			this.#emit({
				kind: "failed",
				track,
				reason:
					this.#binaries.ffmpeg === null
						? "it is not offered in a format Discord can play, and FFmpeg is not installed"
						: "no playable audio was offered for it",
			});
			await this.#advancePast();
			return;
		}

		const stream = openStream(track.url, plan, this.#binaries);
		const resource = createAudioResource(stream.stream, { inputType: STREAM_TYPES[plan.shape] });

		this.#stream = stream;
		this.#resource = resource;
		this.#skipped = false;
		this.#clearLeaveTimer();
		this.#player.play(resource);
		this.#emit({ kind: "track", track });
	}

	async #onIdle(): Promise<void> {
		if (this.#destroyed) return;

		const track = currentTrack(this.queue);
		const decision = decideOnIdle({
			state: this.queue,
			playedMs: this.playedMs,
			expectedMs: track?.durationMs ?? null,
			attempts: this.#attempts,
			stopping: this.#stopping,
			skipped: this.#skipped,
		});

		this.#closeStream();

		if (decision.action === "retry" && track !== null) {
			this.#attempts = decision.attempt;
			this.#emit({ kind: "retrying", track, attempt: decision.attempt });
			await this.play(this.queue.index);
			return;
		}

		this.#attempts = 0;

		if (decision.action === "play") {
			await this.play(decision.index);
			return;
		}

		this.#stopping = false;
		this.#emit({ kind: "queue-ended" });
		this.#startLeaveTimer();
	}

	/** Moves past a track that could not be opened at all, without counting it as a break worth retrying. */
	async #advancePast(): Promise<void> {
		this.#skipped = true;
		this.#attempts = 0;
		await this.#onIdle();
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

	#closeStream(): void {
		this.#stream?.close();
		this.#stream = null;
		this.#resource = null;
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
		this.#closeStream();
		this.#player.stop(true);
		this.#connection?.destroy();
		this.#connection = null;
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
