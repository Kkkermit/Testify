import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	sectionWithThumbnail,
	text,
} from "@lib/containers.util";
import { formatClock, formatDuration, progressBar, truncate } from "@lib/format.util";
import { currentTrack, type QueueState, totalDurationMs, type Track, upcomingPage } from "@lib/musicQueue.util";

/** The player as one screen: what is on, what is next, and the controls beside them. */

export const MUSIC_ID = "music";

/** Five upcoming rows is what fits before the container stops being glanceable. */
export const QUEUE_PAGE_SIZE = 5;

/** Discord's own cap on a title is generous; this is what stays readable in a container row. */
const TITLE_MAX = 60;

export interface PanelState {
	queue: QueueState;
	playedMs: number;
	paused: boolean;
	page: number;
	/** A one-line result from the last press, shown under the heading. */
	note?: string | undefined;
}

export function trackLine(track: Track): string {
	const length = track.durationMs === null ? "live" : formatClock(track.durationMs);
	const author = track.author === null ? "" : ` — ${truncate(track.author, 30)}`;

	return `**${truncate(track.title, TITLE_MAX)}**${author} \`${length}\``;
}

/** The elapsed/total line under the current track, or nothing at all for a stream that has no end. */
export function progressLine(track: Track, playedMs: number): string {
	if (track.durationMs === null) return "`🔴 live`";

	const played = Math.min(playedMs, track.durationMs);

	return `\`${formatClock(played)}\` ${progressBar(played, track.durationMs, 18)} \`${formatClock(track.durationMs)}\``;
}

export function queueSummary(state: QueueState): string {
	const upcoming = state.tracks.slice(state.index + 1);
	if (upcoming.length === 0) return "Nothing queued after this.";

	const total = totalDurationMs(upcoming);
	const length = total === null ? "some of it live" : formatDuration(total);

	return `**${String(upcoming.length)}** queued · ${length}`;
}

const LOOP_LABELS = { off: "Loop: off", track: "Loop: track", queue: "Loop: queue" } as const;

function controls(state: PanelState, userId: string): ContainerPart[] {
	const playing = currentTrack(state.queue) !== null;

	return [
		row(
			button({
				id: customId(MUSIC_ID, state.paused ? "resume" : "pause", userId),
				label: state.paused ? "Resume" : "Pause",
				emoji: state.paused ? "▶️" : "⏸️",
				style: ButtonStyle.Secondary,
				disabled: !playing,
			}),
			button({
				id: customId(MUSIC_ID, "skip", userId),
				label: "Skip",
				emoji: "⏭️",
				style: ButtonStyle.Secondary,
				disabled: !playing,
			}),
			button({
				id: customId(MUSIC_ID, "loop", userId),
				label: LOOP_LABELS[state.queue.loop],
				emoji: "🔁",
				style: state.queue.loop === "off" ? ButtonStyle.Secondary : ButtonStyle.Primary,
			}),
			button({
				id: customId(MUSIC_ID, "shuffle", userId),
				label: "Shuffle",
				emoji: "🔀",
				style: ButtonStyle.Secondary,
				disabled: state.queue.tracks.length - state.queue.index < 3,
			}),
			button({
				id: customId(MUSIC_ID, "stop", userId),
				label: "Stop",
				emoji: "⏹️",
				style: ButtonStyle.Danger,
				disabled: !playing,
			}),
		),
	];
}

function paging(state: PanelState, pageCount: number, userId: string): ContainerPart[] {
	if (pageCount < 2) return [];

	return [
		row(
			button({
				id: customId(MUSIC_ID, "page", String(state.page - 1), userId),
				label: "Previous",
				style: ButtonStyle.Secondary,
				disabled: state.page <= 0,
			}),
			button({
				id: customId(MUSIC_ID, "page", String(state.page + 1), userId),
				label: "Next",
				style: ButtonStyle.Secondary,
				disabled: state.page >= pageCount - 1,
			}),
		),
	];
}

export function musicPanel(state: PanelState, userId: string): ContainerMessage {
	const track = currentTrack(state.queue);
	const parts: ContainerPart[] = [text("## 🎵 Now playing")];

	if (state.note !== undefined) parts.push(text(`-# ${state.note}`));

	if (track === null) {
		parts.push(text("Nothing is playing. Use `/play` to start something."));
		return containerMessage(container({ category: "music", parts }));
	}

	const heading = `${state.paused ? "⏸️ " : ""}${trackLine(track)}\n${progressLine(track, state.playedMs)}`;

	parts.push(
		track.thumbnail === null ? text(heading) : sectionWithThumbnail(heading, track.thumbnail),
		divider(),
		text(queueSummary(state.queue)),
	);

	const page = upcomingPage(state.queue, state.page, QUEUE_PAGE_SIZE);
	for (const { position, track: queued } of page.entries) {
		parts.push(text(`\`${String(position - state.queue.index)}.\` ${trackLine(queued)}`));
	}

	parts.push(divider({ spacer: true }), ...controls(state, userId), ...paging(state, page.pageCount, userId));

	return containerMessage(container({ category: "music", parts }));
}
