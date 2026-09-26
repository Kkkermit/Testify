import { type Readable } from "node:stream";
import { type MUSIC_SOURCES, type LOOP_MODES } from "@lib/music/music.constants";

/** The types more than one module in this domain shares. */

export interface MusicBinaries {
	/** Required: nothing can be resolved or streamed without it. */
	ytDlp: string | null;
	/** Optional: only a source that is not already Opus needs transcoding. */
	ffmpeg: string | null;
	/** What the chosen yt-dlp reports, which is a release date and so also its age. */
	ytDlpVersion?: string | null;
}

export interface RemoteFormat {
	format_id: string;
	acodec?: string | null;
	vcodec?: string | null;
	ext?: string | null;
	protocol?: string | null;
	abr?: number | null;
	/** The total bitrate, which is the audio's own for an audio-only format; some sources state only this. */
	tbr?: number | null;
}

/** How the bytes reach Discord: the first two are passed through untouched, the third is re-encoded. */
export type StreamShape = "webm-opus" | "ogg-opus" | "transcode";

export interface StreamPlan {
	formatId: string;
	shape: StreamShape;
}

export type ProblemKind = "forbidden" | "bot-check" | "unavailable";

export interface DownloadProblem {
	kind: ProblemKind;
	/** One sentence for the panel, written as advice rather than as an error. */
	advice: string;
}

export type MusicSource = (typeof MUSIC_SOURCES)[number];

export type Query =
	{ kind: "url"; url: string; source: MusicSource } | { kind: "search"; terms: string; source: MusicSource };

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

export type LoopMode = (typeof LOOP_MODES)[number];

export interface QueueState {
	tracks: Track[];
	/** Which track is playing; -1 before anything has started. */
	index: number;
	loop: LoopMode;
}

export interface OpenStream {
	stream: Readable;
	plan: StreamPlan;
	/** Kills the processes this opened; safe to call more than once. */
	close: () => void;
}
