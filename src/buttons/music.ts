import { type Queue } from "distube";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { confirmRow } from "@lib/components.util";
import { music } from "@lib/music.util";
import {
	MUSIC_PANEL_ID,
	musicPanel,
	nextVolume,
	type PanelState,
	queuePage,
	type QueueEntry,
} from "@lib/musicPanel.util";

/**
 * Every transport control on the now-playing panel.
 *
 * The panel is one message that gets mutated, so every branch here ends in
 * `update()` rather than a fresh reply — the whole point of the panel is that
 * the channel does not fill up with "skipped!" messages.
 */

/** Maps a live DisTube queue onto the shape the panel renders from. */
export function panelStateOf(queue: Queue): PanelState {
	const song = queue.songs[0];

	return {
		title: song?.name ?? "Unknown track",
		...(song?.url !== undefined ? { url: song.url } : {}),
		...(song?.uploader.name !== undefined ? { author: song.uploader.name } : {}),
		...(song?.user !== undefined ? { requestedBy: song.user.username } : {}),
		...(song?.thumbnail !== undefined ? { thumbnail: song.thumbnail } : {}),
		elapsedMs: queue.currentTime * 1_000,
		durationMs: (song?.duration ?? 0) * 1_000,
		volume: queue.volume,
		repeatMode: queue.repeatMode,
		paused: queue.paused,
		queueLength: Math.max(0, queue.songs.length - 1),
	};
}

export function queueEntriesOf(queue: Queue): QueueEntry[] {
	return queue.songs.slice(1).map((song) => ({
		title: song.name ?? "Unknown track",
		durationMs: song.duration * 1_000,
		...(song.user !== undefined ? { requestedBy: song.user.username } : {}),
	}));
}

export default defineButton({
	id: MUSIC_PANEL_ID,

	async run(interaction, context) {
		if (!interaction.isButton()) return;
		if (interaction.guild === null) return;

		const queue = music(context.client).getQueue(interaction.guild.id);
		if (!queue) throw new UserFacingError("Nothing is playing any more.");

		// Anyone listening may drive playback; someone in another channel may not.
		const listening = interaction.guild.members.cache.get(interaction.user.id)?.voice.channelId;
		if (listening !== queue.voiceChannel?.id) {
			throw new UserFacingError("Join the voice channel to use the player controls.");
		}

		switch (context.action) {
			case "playpause":
				if (queue.paused) await queue.resume();
				else await queue.pause();
				break;

			case "skip":
				// `skip()` throws on the last track, where stopping is what is meant.
				if (queue.songs.length > 1) await queue.skip();
				else await queue.stop();
				break;

			case "prev":
				if (!queue.previousSongs.length) throw new UserFacingError("There is nothing to go back to.");
				await queue.previous();
				break;

			case "loop":
				queue.setRepeatMode((queue.repeatMode + 1) % 3);
				break;

			case "shuffle":
				await queue.shuffle();
				break;

			case "vol": {
				const [direction] = context.args;
				queue.setVolume(nextVolume(queue.volume, direction === "up" ? "up" : "down"));
				break;
			}

			case "queue": {
				const [rawPage = "0"] = context.args;
				await interaction.update(queuePage(queueEntriesOf(queue), Number.parseInt(rawPage, 10) || 0));
				return;
			}

			case "panel":
				break;

			// Destroys the queue, so it asks first.
			case "stop":
				await interaction.update({
					embeds: musicPanel(panelStateOf(queue)).embeds,
					components: [confirmRow(MUSIC_PANEL_ID, "stop", interaction.user.id)],
				});
				return;

			case "stop-yes":
				await queue.stop();
				await interaction.update(musicPanel({ ...panelStateOf(queue), finished: true }));
				return;

			case "stop-no":
				break;

			default:
				return;
		}

		await interaction.update(musicPanel(panelStateOf(queue)));
	},
});
