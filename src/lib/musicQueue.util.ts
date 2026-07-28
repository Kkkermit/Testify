import { type Queue } from "distube";
import { type PanelState, type QueueEntry } from "@lib/musicPanel.util";

/**
 * The bridge between a live DisTube queue and the pure panel renderer.
 *
 * It lives here rather than in `musicPanel.util.ts` so that file stays free of
 * DisTube types and testable without a player, and rather than in the button
 * handler so a command can open the panel without importing one.
 */

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
