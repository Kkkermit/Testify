import { type ActionRowBuilder, ButtonStyle, type MessageActionRowComponentBuilder } from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { button, disableAll, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	sectionWithThumbnail,
	text,
} from "@lib/containers.util";
import { formatNumber, formatTrackTime, progressBar } from "@lib/format.util";

/**
 * The now-playing panel.
 *
 * Music was the only feature in the bot with no interactive components at all —
 * twenty-one separate typed commands for what is one set of transport controls.
 * This renders the whole thing as one message the handlers mutate in place.
 *
 * Built as a Components V2 container rather than an embed so the album art sits
 * beside the track rather than floating in a corner, and so the transport rows
 * are part of the same bordered block instead of hanging underneath it.
 *
 * Kept pure and free of DisTube types so it can be tested without a player: the
 * command layer reads the queue, this decides what the panel looks like.
 */

export const MUSIC_PANEL_ID = "music";

/** What the panel needs to know. A queue is mapped onto this by `@lib/musicQueue.util`. */
export interface PanelState {
	title: string;
	url?: string;
	author?: string;
	requestedBy?: string;
	thumbnail?: string;
	/** Milliseconds. */
	elapsedMs: number;
	durationMs: number;
	volume: number;
	/** 0 off, 1 repeat song, 2 repeat queue — DisTube's own numbering. */
	repeatMode: number;
	paused: boolean;
	queueLength: number;
	/** True once playback has stopped, which disables every control. */
	finished?: boolean;
}

const REPEAT_LABELS = ["Off", "Track", "Queue"] as const;

export function repeatLabel(mode: number): string {
	return REPEAT_LABELS[mode] ?? "Off";
}

/** Volume moves in steps, so the buttons disable cleanly at the ends. */
export const VOLUME_STEP = 10;
export const VOLUME_MAX = 150;

export function nextVolume(current: number, direction: "up" | "down"): number {
	const target = direction === "up" ? current + VOLUME_STEP : current - VOLUME_STEP;
	return Math.max(0, Math.min(VOLUME_MAX, target));
}

/** The written half of the panel, without the controls. */
export function panelBody(state: PanelState): ContainerPart[] {
	const heading = state.finished === true ? "Queue ended" : state.paused ? "Paused" : "Now playing";
	const title = state.url !== undefined ? `**[${state.title}](${state.url})**` : `**${state.title}**`;

	const summary = [
		`### ${state.paused ? theme.music.pause : theme.music.play} ${heading}`,
		title,
		state.author ?? "",
		"",
		progressBar(state.elapsedMs, Math.max(1, state.durationMs)),
		`\`${formatTrackTime(state.elapsedMs)}\` / \`${formatTrackTime(state.durationMs)}\``,
	]
		.filter(Boolean)
		.join("\n");

	const details = [
		`${theme.music.volume} **${state.volume}%**`,
		`${theme.music.repeat} **${repeatLabel(state.repeatMode)}**`,
		`${theme.music.queue} **${formatNumber(state.queueLength)}** queued`,
		...(state.requestedBy !== undefined ? [`-# Requested by ${state.requestedBy}`] : []),
	];

	return [
		state.thumbnail !== undefined ? sectionWithThumbnail(summary, state.thumbnail, state.title) : text(summary),
		divider(),
		text(details.slice(0, 3).join("  ·  ") + (details[3] !== undefined ? `\n${details[3]}` : "")),
	];
}

export function panelComponents(state: PanelState): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
	const rows = [
		row(
			button({ id: customId(MUSIC_PANEL_ID, "prev"), emoji: theme.music.previous }),
			button({
				id: customId(MUSIC_PANEL_ID, "playpause"),
				emoji: state.paused ? theme.music.play : theme.music.pause,
				style: ButtonStyle.Primary,
			}),
			button({ id: customId(MUSIC_PANEL_ID, "skip"), emoji: theme.music.skip }),
			// Destructive, so it asks before throwing the queue away.
			button({ id: customId(MUSIC_PANEL_ID, "stop"), emoji: theme.music.stop, style: ButtonStyle.Danger }),
			button({
				id: customId(MUSIC_PANEL_ID, "loop"),
				label: repeatLabel(state.repeatMode),
				emoji: theme.music.repeat,
			}),
		),
		row(
			button({ id: customId(MUSIC_PANEL_ID, "vol", "down"), label: "−10", disabled: state.volume <= 0 }),
			button({ id: customId(MUSIC_PANEL_ID, "vol", "up"), label: "+10", disabled: state.volume >= VOLUME_MAX }),
			button({ id: customId(MUSIC_PANEL_ID, "shuffle"), emoji: theme.music.shuffle, disabled: state.queueLength < 2 }),
			button({
				id: customId(MUSIC_PANEL_ID, "queue", 0),
				label: "Queue",
				emoji: theme.music.queue,
				disabled: state.queueLength < 1,
			}),
		),
	];

	return state.finished === true ? disableAll(rows) : rows;
}

export function musicPanel(state: PanelState): ContainerMessage {
	return containerMessage(container({ category: "music", parts: [...panelBody(state), ...panelComponents(state)] }));
}

/** The panel with its controls swapped for a confirm/cancel pair. */
export function panelWithControls(
	state: PanelState,
	controls: ActionRowBuilder<MessageActionRowComponentBuilder>[],
): ContainerMessage {
	return containerMessage(container({ category: "music", parts: [...panelBody(state), ...controls] }));
}

/** The paginated queue browser behind the Queue button. */
export const QUEUE_PAGE_SIZE = 10;

export interface QueueEntry {
	title: string;
	durationMs: number;
	requestedBy?: string;
}

export function queuePage(entries: QueueEntry[], page: number): ContainerMessage {
	const total = Math.max(1, Math.ceil(entries.length / QUEUE_PAGE_SIZE));
	const current = Math.min(Math.max(0, page), total - 1);
	const start = current * QUEUE_PAGE_SIZE;
	const slice = entries.slice(start, start + QUEUE_PAGE_SIZE);

	const lines = slice.map((entry, index) => {
		const position = start + index + 1;
		const by = entry.requestedBy !== undefined ? ` · ${entry.requestedBy}` : "";
		return `\`${position}.\` ${entry.title} — ${formatTrackTime(entry.durationMs)}${by}`;
	});

	return containerMessage(
		container({
			category: "music",
			parts: [
				text(`### ${theme.music.queue} Queue\n${lines.join("\n") || "Nothing queued."}`),
				divider(),
				text(`-# Page ${current + 1} of ${total} • ${formatNumber(entries.length)} tracks`),
				row(
					button({
						id: customId(MUSIC_PANEL_ID, "queue", Math.max(0, current - 1)),
						emoji: theme.emoji.previous,
						disabled: current <= 0,
					}),
					button({
						id: customId(MUSIC_PANEL_ID, "queue", Math.min(total - 1, current + 1)),
						emoji: theme.emoji.next,
						disabled: current >= total - 1,
					}),
					button({ id: customId(MUSIC_PANEL_ID, "panel"), label: "Back", style: ButtonStyle.Secondary }),
				),
			],
		}),
	);
}
