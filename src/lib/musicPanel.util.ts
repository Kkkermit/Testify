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
import { clampVolume, DEFAULT_VOLUME, MAX_VOLUME, MIN_VOLUME, VOLUME_STEP } from "@lib/musicFormat.util";
import { type MusicSource } from "@lib/musicQuery.util";
import { currentTrack, type QueueState, totalDurationMs, type Track, upcomingPage } from "@lib/musicQueue.util";

/** The player as one screen: what is on, what is next, and the controls beside them. */

export const MUSIC_ID = "music";

/** Five upcoming rows is what fits before the container stops being glanceable. */
export const QUEUE_PAGE_SIZE = 5;

/** Discord's own cap on a title is generous; this is what stays readable in a container row. */
const TITLE_MAX = 60;

/** How wide the bar under the current track is drawn. */
const BAR_CELLS = 18;

const SOURCE_EMOJI: Record<MusicSource, string> = {
	youtube: "📺",
	soundcloud: "🔊",
	spotify: "🟢",
	other: "🎧",
};

export interface PanelState {
	queue: QueueState;
	playedMs: number;
	paused: boolean;
	page: number;
	/** The level the player is set to, as a percentage of the track's own. */
	volume?: number;
	/** False when the host has no FFmpeg, which is the only thing that can change the level. */
	canSetVolume?: boolean;
	/** A one-line result from the last press, shown under the heading. */
	note?: string | undefined;
}

/** Discord's link syntax breaks on a bracket in the label and on whitespace in the address. */
export function link(label: string, url: string): string {
	if (/[\s<>()]/.test(url)) return label;

	return `[${label.replace(/([[\]])/g, "\\$1")}](${url})`;
}

export function trackLine(track: Track): string {
	const length = track.durationMs === null ? "live" : formatClock(track.durationMs);
	const author = track.author === null ? "" : ` — ${truncate(track.author, 30)}`;

	return `**${truncate(track.title, TITLE_MAX)}**${author} \`${length}\``;
}

/** The current track's own line, which links out because the panel is the only place the address is shown. */
export function headlineFor(track: Track): string {
	const author = track.author === null ? "" : `\n-# ${truncate(track.author, 60)}`;

	return `${SOURCE_EMOJI[track.source]} ${link(`**${truncate(track.title, TITLE_MAX)}**`, track.url)}${author}`;
}

/** The elapsed/total line under the current track, or nothing at all for a stream that has no end. */
export function progressLine(track: Track, playedMs: number): string {
	if (track.durationMs === null) return "`🔴 live`";

	const played = Math.min(playedMs, track.durationMs);

	return `\`${formatClock(played)}\` ${progressBar(played, track.durationMs, BAR_CELLS)} \`${formatClock(track.durationMs)}\``;
}

const LOOP_WORDS = { off: "off", track: "track", queue: "queue" } as const;

/** Level, repeat and who asked for it, on one line so the bar above it stays uncluttered. */
export function statusLine(state: PanelState, track: Track): string {
	const volume = clampVolume(state.volume ?? DEFAULT_VOLUME);
	const parts = [
		state.canSetVolume === true ? `🔊 ${String(volume)}%` : "🔊 track level",
		`🔁 ${LOOP_WORDS[state.queue.loop]}`,
		`👤 <@${track.requestedBy}>`,
	];

	return `-# ${parts.join(" · ")}`;
}

export function queueSummary(state: QueueState): string {
	const upcoming = state.tracks.slice(state.index + 1);
	if (upcoming.length === 0) return "-# Nothing queued after this.";

	const total = totalDurationMs(upcoming);
	const length = total === null ? "some of it live" : formatDuration(total);

	return `**Up next** · ${String(upcoming.length)} queued · ${length}`;
}

const LOOP_LABELS = { off: "Loop: off", track: "Loop: track", queue: "Loop: queue" } as const;

function transport(state: PanelState, userId: string): ContainerPart {
	const playing = currentTrack(state.queue) !== null;

	return row(
		button({
			id: customId(MUSIC_ID, "previous", userId),
			label: "Previous",
			emoji: "⏮️",
			disabled: !playing,
		}),
		button({
			id: customId(MUSIC_ID, state.paused ? "resume" : "pause", userId),
			label: state.paused ? "Resume" : "Pause",
			emoji: state.paused ? "▶️" : "⏸️",
			style: state.paused ? ButtonStyle.Success : ButtonStyle.Secondary,
			disabled: !playing,
		}),
		button({ id: customId(MUSIC_ID, "skip", userId), label: "Skip", emoji: "⏭️", disabled: !playing }),
		button({
			id: customId(MUSIC_ID, "loop", userId),
			label: LOOP_LABELS[state.queue.loop],
			emoji: "🔁",
			style: state.queue.loop === "off" ? ButtonStyle.Secondary : ButtonStyle.Primary,
		}),
		button({
			id: customId(MUSIC_ID, "stop", userId),
			label: "Stop",
			emoji: "⏹️",
			style: ButtonStyle.Danger,
			disabled: !playing,
		}),
	);
}

/** Louder and quieter move by a step and are clamped, so a press at either end cannot go past it. */
export function volumeStep(current: number, direction: -1 | 1): number {
	return clampVolume(clampVolume(current) + direction * VOLUME_STEP);
}

function extras(state: PanelState, userId: string): ContainerPart {
	const volume = clampVolume(state.volume ?? DEFAULT_VOLUME);
	const adjustable = state.canSetVolume === true && currentTrack(state.queue) !== null;

	return row(
		button({
			id: customId(MUSIC_ID, "shuffle", userId),
			label: "Shuffle",
			emoji: "🔀",
			disabled: state.queue.tracks.length - state.queue.index < 3,
		}),
		button({
			id: customId(MUSIC_ID, "volume", String(volumeStep(volume, -1)), userId),
			label: `-${String(VOLUME_STEP)}%`,
			emoji: "🔉",
			disabled: !adjustable || volume <= MIN_VOLUME,
		}),
		button({
			id: customId(MUSIC_ID, "volume", String(volumeStep(volume, 1)), userId),
			label: `+${String(VOLUME_STEP)}%`,
			emoji: "🔊",
			disabled: !adjustable || volume >= MAX_VOLUME,
		}),
		button({ id: customId(MUSIC_ID, "refresh", userId), label: "Refresh", emoji: "🔄" }),
	);
}

function paging(state: PanelState, pageCount: number, userId: string): ContainerPart[] {
	if (pageCount < 2) return [];

	return [
		row(
			button({
				id: customId(MUSIC_ID, "page", String(state.page - 1), userId),
				label: "Previous page",
				disabled: state.page <= 0,
			}),
			// Its own page number, because two buttons in one message may not share a custom ID.
			button({
				id: customId(MUSIC_ID, "page", String(state.page), userId),
				label: `Page ${String(state.page + 1)}/${String(pageCount)}`,
				disabled: true,
			}),
			button({
				id: customId(MUSIC_ID, "page", String(state.page + 1), userId),
				label: "Next page",
				disabled: state.page >= pageCount - 1,
			}),
		),
	];
}

export function musicPanel(state: PanelState, userId: string): ContainerMessage {
	const track = currentTrack(state.queue);
	const parts: ContainerPart[] = [text(state.paused ? "## ⏸️ Paused" : "## 🎵 Now playing")];

	if (state.note !== undefined) parts.push(text(`-# ${state.note}`));

	if (track === null) {
		parts.push(text("Nothing is playing. Use `/play` to start something."));
		return containerMessage(container({ category: "music", parts }));
	}

	const headline = `${headlineFor(track)}\n${progressLine(track, state.playedMs)}\n${statusLine(state, track)}`;

	parts.push(
		track.thumbnail === null ? text(headline) : sectionWithThumbnail(headline, track.thumbnail),
		divider(),
		text(queueSummary(state.queue)),
	);

	const page = upcomingPage(state.queue, state.page, QUEUE_PAGE_SIZE);
	for (const { position, track: queued } of page.entries) {
		parts.push(text(`\`${String(position - state.queue.index)}.\` ${trackLine(queued)}`));
	}

	parts.push(
		divider({ spacer: true }),
		transport(state, userId),
		extras(state, userId),
		...paging(state, page.pageCount, userId),
	);

	return containerMessage(container({ category: "music", parts }));
}
