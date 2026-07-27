import { SoundCloudPlugin } from "@distube/soundcloud";
import { YtDlpPlugin } from "@distube/yt-dlp";
import { DisTube, Events as DisTubeEvent, type Playlist, type Queue, type Song } from "distube";
import ffmpegPath from "ffmpeg-static";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { embed, errorEmbed } from "@lib/embeds";
import { formatTrackTime } from "@lib/format";

let distube: DisTube | undefined;

/** Built once, on first use, because DisTube needs the logged-in client. */
export function music(client: TestifyClient): DisTube {
	distube ??= build(client);
	return distube;
}

function build(client: TestifyClient): DisTube {
	const player = new DisTube(client, {
		plugins: [new SoundCloudPlugin(), new YtDlpPlugin({ update: false })],
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
		client.logger.error({ err: toError(error), guildId: queue?.id ?? null }, "Music playback error");
		void queue?.textChannel?.send({ embeds: [errorEmbed("Something went wrong while playing that track.")] });
	});

	return player;
}
