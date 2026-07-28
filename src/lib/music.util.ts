import { SoundCloudPlugin } from "@distube/soundcloud";
import { YtDlpPlugin } from "@distube/yt-dlp";
import { DisTube, Events as DisTubeEvent, type Playlist, type Queue, type Song } from "distube";
import ffmpegPath from "ffmpeg-static";
import { panelStateOf } from "@buttons/music";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { type RenderedScreen } from "@lib/components.util";
import { embed, errorEmbed } from "@lib/embeds.util";
import { formatTrackTime } from "@lib/format.util";
import { musicPanel } from "@lib/musicPanel.util";

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

	// One panel per queue, edited in place. Posting a fresh "now playing" for every
	// track is what made the channel unreadable on a long queue.
	player.on(DisTubeEvent.PLAY_SONG, (queue: Queue) => {
		void showPanel(queue);
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
		// A dead button should look dead, so the panel is greyed out rather than left live.
		void editPanel(queue, musicPanel({ ...panelStateOf(queue), finished: true }));
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

/**
 * The message ID of each guild's panel, so the next track edits the existing one
 * instead of posting another. Losing the entry just means a new panel is posted.
 */
const panels = new Map<string, string>();

async function showPanel(queue: Queue): Promise<void> {
	const channel = queue.textChannel;
	if (!channel?.isSendable()) return;

	const rendered = musicPanel(panelStateOf(queue));

	if (await editPanel(queue, rendered)) return;

	try {
		const sent = await channel.send(rendered);
		panels.set(queue.id, sent.id);
	} catch {
		// A missing-permissions failure here must not take the playback down with it.
	}
}

/** Returns false when there was no panel to edit, so the caller can post one. */
async function editPanel(queue: Queue, rendered: RenderedScreen): Promise<boolean> {
	const messageId = panels.get(queue.id);
	const channel = queue.textChannel;
	if (messageId === undefined || !channel?.isSendable()) return false;

	try {
		const message = await channel.messages.fetch(messageId);
		await message.edit(rendered);
		return true;
	} catch {
		// Deleted or too old to edit — fall back to posting a fresh one.
		panels.delete(queue.id);
		return false;
	}
}
