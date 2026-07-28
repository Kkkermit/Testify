import { SoundCloudPlugin } from "@distube/soundcloud";
import { YtDlpPlugin } from "@distube/yt-dlp";
import { DisTube, Events as DisTubeEvent, type Playlist, type Queue, type Song } from "distube";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { embed, errorEmbed } from "@lib/embeds.util";
import { resolveFfmpeg } from "@lib/ffmpeg.util";
import { formatTrackTime } from "@lib/format.util";
import { StreamRelay } from "@lib/streamRelay.util";

let distube: DisTube | undefined;
let activeRelay: StreamRelay | undefined;

/** Closes the relay if one was started, so shutdown does not hang on an open socket. */
export async function stopMusic(): Promise<void> {
	await activeRelay?.stop();
	activeRelay = undefined;
	distube = undefined;
}

/**
 * FFmpeg writes its ordinary progress to stderr too, so a plain "there was output"
 * check would warn on every track. These are the lines that mean a stream never
 * arrived — an HTTP status from the CDN, a refused connection, a non-zero exit.
 */
const FFMPEG_FAILURE =
	/\b(4\d{2}|5\d{2}) (Forbidden|Not Found|Unauthorized|Bad Gateway|Service Unavailable)|Server returned|Connection refused|Invalid data found|No such file|error(?!s? in)/i;

/**
 * Routes a plugin's stream URLs through the relay, leaving everything else alone.
 *
 * `getStreamURL` is the one method that hands FFmpeg a remote address, so it is the
 * only seam that needs to know the relay exists. With no relay the plugin is
 * returned untouched.
 */
export function relayed<T extends { getStreamURL(song: never): Promise<string> }>(plugin: T, relay?: StreamRelay): T {
	if (relay === undefined) return plugin;

	const original = plugin.getStreamURL.bind(plugin);

	plugin.getStreamURL = async (song: never): Promise<string> => {
		const url = await original(song);
		await relay.start();
		return relay.register(url);
	};

	return plugin;
}

/** Built once, on first use, because DisTube needs the logged-in client. */
export function music(client: TestifyClient): DisTube {
	distube ??= build(client);
	return distube;
}

function build(client: TestifyClient): DisTube {
	const ffmpeg = resolveFfmpeg(client.env.FFMPEG_PATH);

	// Only when the chosen FFmpeg cannot resolve a hostname. A healthy host streams
	// straight from the CDN and never starts a relay.
	const relay = ffmpeg.degraded === true ? new StreamRelay() : undefined;
	activeRelay = relay;

	if (relay !== undefined) {
		client.logger.warn(
			{ ffmpegPath: ffmpeg.path },
			"[MUSIC] This FFmpeg build cannot resolve hostnames, so tracks are being relayed through " +
				"a local loopback server. Playback works; installing FFmpeg system-wide or setting " +
				"FFMPEG_PATH avoids the extra hop. Run `npm run music:doctor` for detail.",
		);
	} else {
		client.logger.debug({ ffmpegPath: ffmpeg.path, source: ffmpeg.source }, "[MUSIC] Selected FFmpeg");
	}

	const player = new DisTube(client, {
		// The yt-dlp plugin refreshes its binary on construction, and must be last:
		// its `validate()` returns true for every URL, so anything after it is dead.
		plugins: [relayed(new SoundCloudPlugin(), relay), relayed(new YtDlpPlugin({ update: true }), relay)],
		emitNewSongOnly: true,
		savePreviousSongs: true,
		nsfw: false,
		joinNewVoiceChannel: false,
		...(ffmpeg.path !== null ? { ffmpeg: { path: ffmpeg.path } } : {}),
	});

	// Every source ends up as an FFmpeg process fed a stream URL, and DisTube reports
	// that process — its command line, its stderr, its exit code — only through this
	// event. Without a listener a failed fetch is silent: the queue just ends. Run
	// with LOG_LEVEL=debug to see it, and `npm run music:doctor` to check the rest.
	player.on(DisTubeEvent.FFMPEG_DEBUG, (message: string) => {
		if (FFMPEG_FAILURE.test(message)) client.logger.warn({ ffmpeg: message }, "[MUSIC] FFmpeg reported a problem");
		else client.logger.debug({ ffmpeg: message }, "[MUSIC] FFmpeg");
	});

	player.on(DisTubeEvent.PLAY_SONG, (queue: Queue, song: Song) => {
		void queue.textChannel?.send({
			embeds: [
				embed({
					category: "music",
					title: `${theme.music.play} Now playing`,
					description: `**[${song.name}](${song.url})** — ${song.formattedDuration}`,
					footer: `Requested by ${song.user?.username ?? "unknown"} • /now-playing for the controls`,
					...(song.thumbnail !== undefined ? { thumbnail: song.thumbnail } : {}),
				}),
			],
		});
	});

	player.on(DisTubeEvent.ADD_SONG, (queue: Queue, song: Song) => {
		void queue.textChannel?.send({
			embeds: [
				embed({
					category: "music",
					title: `${theme.music.success} Added to the queue`,
					description: `**[${song.name ?? "Unknown track"}](${song.url})** — ${song.formattedDuration}`,
					footer: `Position ${queue.songs.length} • ${formatTrackTime(queue.duration * 1_000)} of music queued`,
				}),
			],
		});
	});

	player.on(DisTubeEvent.ADD_LIST, (queue: Queue, playlist: Playlist) => {
		void queue.textChannel?.send({
			embeds: [
				embed({
					category: "music",
					title: `${theme.music.queue} Added a playlist`,
					description: `**[${playlist.name ?? "Playlist"}](${playlist.url ?? ""})** — ${playlist.songs.length} tracks`,
				}),
			],
		});
	});

	player.on(DisTubeEvent.FINISH, (queue: Queue) => {
		void queue.textChannel?.send({
			embeds: [embed({ category: "music", description: `${theme.music.stop} The queue has finished.` })],
		});
	});

	player.on(DisTubeEvent.DISCONNECT, (queue: Queue) => {
		void queue.textChannel?.send({
			embeds: [embed({ category: "music", description: `${theme.music.stop} Disconnected from the voice channel.` })],
		});
	});

	player.on(DisTubeEvent.ERROR, (error: Error, queue: Queue | undefined) => {
		client.logger.error({ err: toError(error), guildId: queue?.id ?? null }, "[MUSIC_ERROR] Playback failed");
		void queue?.textChannel?.send({ embeds: [errorEmbed(explainPlaybackFailure(error))] });
	});

	return player;
}

/**
 * Turns an extraction failure into something a server owner can act on.
 *
 * yt-dlp breaks whenever YouTube changes, and the raw stderr is a wall of Python
 * warnings — so the common causes get named explicitly instead of the user
 * seeing an empty queue and no explanation.
 */
export function explainPlaybackFailure(error: unknown): string {
	const detail = error as { stderr?: string; message?: string };
	const text = String(detail.stderr ?? detail.message ?? error);

	if (/no-call-home|Deprecated Feature/i.test(text)) {
		return "The track extractor is out of date. Run `npm run music:update` to refresh yt-dlp, then try again.";
	}
	if (/Sign in to confirm|not a bot|429|Too Many Requests/i.test(text)) {
		return "YouTube is rate limiting this server. Wait a few minutes, or try a SoundCloud link.";
	}
	if (/Video unavailable|Private video|members-only|age[- ]restricted/i.test(text)) {
		return "That track is not available — it may be private, age-restricted or region-locked.";
	}
	if (/Unable to (download|connect)|proxy|ENOTFOUND|ETIMEDOUT/i.test(text)) {
		return "Could not reach the track source. Check the host's network, then try again.";
	}
	if (/ffmpeg/i.test(text)) {
		return "FFmpeg could not decode that track. Reinstall dependencies with `npm ci`.";
	}

	return "Something went wrong while playing that track. The full error is in the bot's logs.";
}
