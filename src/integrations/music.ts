import { SoundCloudPlugin } from "@distube/soundcloud";
import { SpotifyPlugin } from "@distube/spotify";
import { YtDlpPlugin } from "@distube/yt-dlp";
import { DisTube, Events as DisTubeEvent, type Playlist, type Queue, type Song } from "distube";
import ffmpegPath from "ffmpeg-static";
import { theme } from "../config/theme";
import { type TestifyClient } from "../core/client";
import { toError } from "../core/errors";
import { embed, errorEmbed } from "../ui/embeds";
import { formatTrackTime } from "../ui/format";

const STATE_KEY = "music:distube";

export function createMusicClient(client: TestifyClient): DisTube {
	const plugins = [
		new SpotifyPlugin(
			client.env.SPOTIFY_CLIENT_ID !== undefined && client.env.SPOTIFY_CLIENT_SECRET !== undefined
				? { api: { clientId: client.env.SPOTIFY_CLIENT_ID, clientSecret: client.env.SPOTIFY_CLIENT_SECRET } }
				: {},
		),
		new SoundCloudPlugin(),
		new YtDlpPlugin({ update: false }),
	];

	const distube = new DisTube(client, {
		plugins,
		emitNewSongOnly: true,
		savePreviousSongs: true,
		nsfw: false,
		joinNewVoiceChannel: false,
		...(ffmpegPath !== null ? { ffmpeg: { path: ffmpegPath } } : {}),
	});

	distube.on(DisTubeEvent.PLAY_SONG, (queue: Queue, song: Song) => {
		void queue.textChannel?.send({
			embeds: [
				embed({
					category: "music",
					title: `${theme.music.play} Now playing`,
					description: `**[${song.name ?? "Unknown track"}](${song.url})**`,
					fields: [
						{ name: "Duration", value: song.formattedDuration, inline: true },
						{ name: "Requested by", value: song.user?.toString() ?? "unknown", inline: true },
						{ name: "Volume", value: `${queue.volume}%`, inline: true },
					],
					...(song.thumbnail !== undefined ? { thumbnail: song.thumbnail } : {}),
				}),
			],
		});
	});

	distube.on(DisTubeEvent.ADD_SONG, (queue: Queue, song: Song) => {
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

	distube.on(DisTubeEvent.ADD_LIST, (queue: Queue, playlist: Playlist) => {
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

	distube.on(DisTubeEvent.FINISH, (queue: Queue) => {
		void queue.textChannel?.send({
			embeds: [embed({ category: "music", description: `${theme.music.stop} The queue has finished.` })],
		});
	});

	distube.on(DisTubeEvent.DISCONNECT, (queue: Queue) => {
		void queue.textChannel?.send({
			embeds: [embed({ category: "music", description: `${theme.music.stop} Disconnected from the voice channel.` })],
		});
	});

	// The previous handler responded to playback errors by shelling out to
	// `npm install`, which is never an appropriate reaction to a runtime failure.
	distube.on(DisTubeEvent.ERROR, (error: Error, queue: Queue | undefined) => {
		client.logger.error({ err: toError(error), guildId: queue?.id ?? null }, "Music playback error");
		void queue?.textChannel?.send({ embeds: [errorEmbed("Something went wrong while playing that track.")] });
	});

	return distube;
}

export function getMusicClient(client: TestifyClient): DisTube {
	return client.featureState(STATE_KEY, () => createMusicClient(client));
}

export function attachMusicClient(client: TestifyClient): void {
	client.state.set(STATE_KEY, createMusicClient(client));
}
