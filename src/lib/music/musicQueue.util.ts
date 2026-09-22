import { type MusicSource } from "@lib/music/musicQuery.util";

/** The queue and the rules for moving through it, with no voice connection and no network in sight. */

export interface Track {
	/** Stable across a restart, so a panel left open still names the right thing. */
	url: string;
	title: string;
	author: string | null;
	durationMs: number | null;
	thumbnail: string | null;
	source: MusicSource;
	requestedBy: string;
}

export const LOOP_MODES = ["off", "track", "queue"] as const;

export type LoopMode = (typeof LOOP_MODES)[number];

export interface QueueState {
	tracks: Track[];
	/** Which track is playing; -1 before anything has started. */
	index: number;
	loop: LoopMode;
}

export const EMPTY_QUEUE: QueueState = { tracks: [], index: -1, loop: "off" };

/** A track shorter than this much of its stated length came apart rather than finished. */
export const EARLY_TOLERANCE_MS = 2_000;

/** Past this many goes at one track, the queue moves on rather than stalling on it for ever. */
export const MAX_TRACK_ATTEMPTS = 3;

export function currentTrack(state: QueueState): Track | null {
	return state.tracks[state.index] ?? null;
}

export function enqueue(state: QueueState, tracks: Track[]): QueueState {
	return { ...state, tracks: [...state.tracks, ...tracks] };
}

/** Puts tracks directly after the one playing, for a "play next" that does not disturb the rest. */
export function enqueueNext(state: QueueState, tracks: Track[]): QueueState {
	const at = state.index + 1;
	return { ...state, tracks: [...state.tracks.slice(0, at), ...tracks, ...state.tracks.slice(at)] };
}

export function removeAt(state: QueueState, position: number): QueueState {
	if (position < 0 || position >= state.tracks.length) return state;

	const tracks = state.tracks.filter((_, at) => at !== position);
	// Removing something already played would otherwise slide the current track out from under the player.
	const index = position < state.index ? state.index - 1 : state.index;

	return { ...state, tracks, index };
}

export function clearUpcoming(state: QueueState): QueueState {
	return { ...state, tracks: state.tracks.slice(0, state.index + 1) };
}

/**
 * Shuffles only what has not played yet, so the history stays in the order it happened.
 *
 * `random` is a parameter because a shuffle nobody can pin down is a shuffle nobody can test.
 */
export function shuffleUpcoming(state: QueueState, random: () => number = Math.random): QueueState {
	const played = state.tracks.slice(0, state.index + 1);
	const upcoming = [...state.tracks.slice(state.index + 1)];

	for (let at = upcoming.length - 1; at > 0; at--) {
		const swap = Math.floor(random() * (at + 1));
		[upcoming[at], upcoming[swap]] = [upcoming[swap]!, upcoming[at]!];
	}

	return { ...state, tracks: [...played, ...upcoming] };
}

export function withLoop(state: QueueState, loop: LoopMode): QueueState {
	return { ...state, loop };
}

/** Where the queue goes when the current track is genuinely over, or `null` when there is nowhere left. */
export function nextIndex(state: QueueState): number | null {
	if (state.tracks.length === 0) return null;
	if (state.loop === "track" && state.index >= 0) return state.index;

	const following = state.index + 1;
	if (following < state.tracks.length) return following;

	return state.loop === "queue" ? 0 : null;
}

/**
 * Whether a track stopped before it had played what it promised.
 *
 * An unknown length — a live stream — can never be judged, so it is always taken at its word.
 */
export function endedEarly(playedMs: number, expectedMs: number | null, tolerance = EARLY_TOLERANCE_MS): boolean {
	if (expectedMs === null || expectedMs <= 0) return false;

	return playedMs + tolerance < expectedMs;
}

export type IdleAction =
	| { action: "retry"; attempt: number }
	| { action: "play"; index: number }
	| { action: "stop"; reason: "empty" | "requested" };

/**
 * What to do when the player falls idle.
 *
 * A stalled stream and a finished track both arrive as the same event, and treating them the same is what
 * makes a queue skip three songs in a row on a bad connection. Everything here is arithmetic so each branch is
 * a test rather than a live stall.
 */
export function decideOnIdle(input: {
	state: QueueState;
	playedMs: number;
	expectedMs: number | null;
	attempts: number;
	/** Set when a person pressed Stop, which beats every other consideration. */
	stopping?: boolean;
	/** Set when a person pressed Skip, so a deliberately shortened track is not mistaken for a broken one. */
	skipped?: boolean;
	/** Fewer than the usual when the downloader said why it stopped, and the reason is not one a retry fixes. */
	attemptsAllowed?: number;
}): IdleAction {
	const {
		state,
		playedMs,
		expectedMs,
		attempts,
		stopping = false,
		skipped = false,
		attemptsAllowed = MAX_TRACK_ATTEMPTS,
	} = input;

	if (stopping) return { action: "stop", reason: "requested" };

	if (!skipped && endedEarly(playedMs, expectedMs) && attempts < attemptsAllowed) {
		return { action: "retry", attempt: attempts + 1 };
	}

	const following = nextIndex(state);

	return following === null ? { action: "stop", reason: "empty" } : { action: "play", index: following };
}

export interface QueuePage {
	entries: { position: number; track: Track }[];
	page: number;
	pageCount: number;
}

/** A clamped window over what is still to come, so a page past the end shows the last one rather than nothing. */
export function upcomingPage(state: QueueState, page: number, perPage = 5): QueuePage {
	const upcoming = state.tracks
		.map((track, position) => ({ position, track }))
		.filter(({ position }) => position > state.index);

	const pageCount = Math.max(1, Math.ceil(upcoming.length / perPage));
	const clamped = Math.min(Math.max(page, 0), pageCount - 1);

	return { entries: upcoming.slice(clamped * perPage, clamped * perPage + perPage), page: clamped, pageCount };
}

export function totalDurationMs(tracks: Track[]): number | null {
	if (tracks.some((track) => track.durationMs === null)) return null;

	return tracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0);
}
