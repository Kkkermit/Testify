import { SoundCloudPlugin } from "@distube/soundcloud";
import { YtDlpPlugin } from "@distube/yt-dlp";
import { DisTube, Events as DisTubeEvent, type Playlist, type Queue, type Song } from "distube";
import ffmpegPath from "ffmpeg-static";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { embed, errorEmbed } from "@lib/embeds.util";
import { formatTrackTime } from "@lib/format.util";

let distube: DisTube | undefined;

/** Built once, on first use, because DisTube needs the logged-in client. */
export function music(client: TestifyClient): DisTube {
	distube ??= build(client);
	return distube;
}

function build(client: TestifyClient): DisTube {
	const player = new DisTube(client, {
		// yt-dlp breaks every time YouTube changes something, so it refreshes itself
		// on first use. The download is lazy — `music()` is only built when someone
		// actually plays something, so this never slows start-up down.
		plugins: [new SoundCloudPlugin(), new YtDlpPlugin({ update: true })],
		emitNewSongOnly: true,
		savePreviousSongs: true,
		nsfw: false,
		joinNewVoiceChannel: false,
		...(ffmpegPath !== null ? { ffmpeg: { path: ffmpegPath } } : {}),
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
