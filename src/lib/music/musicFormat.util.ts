/** Choosing which of a track's formats to play, and whether that choice needs a transcoder. */

/** The track's own level, which is the one setting that costs nothing to serve. */
export const DEFAULT_VOLUME = 100;
export const MIN_VOLUME = 0;
/** Past this the filter clips rather than getting louder, so it is a ceiling rather than a preference. */
export const MAX_VOLUME = 200;
/** What one press of the panel's louder or quieter button moves. */
export const VOLUME_STEP = 10;

export function clampVolume(volume: number): number {
	if (!Number.isFinite(volume)) return DEFAULT_VOLUME;

	return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(volume)));
}

export interface RemoteFormat {
	format_id: string;
	acodec?: string | null;
	vcodec?: string | null;
	ext?: string | null;
	protocol?: string | null;
	abr?: number | null;
}

/** How the bytes reach Discord: the first two are passed through untouched, the third is re-encoded. */
export type StreamShape = "webm-opus" | "ogg-opus" | "transcode";

export interface StreamPlan {
	formatId: string;
	shape: StreamShape;
}

function isAudioOnly(format: RemoteFormat): boolean {
	return (format.vcodec ?? "none") === "none" && (format.acodec ?? "none") !== "none";
}

/** A plain HTTPS file; a segmented one needs a muxer before it is a stream anybody can play. */
function isProgressive(format: RemoteFormat): boolean {
	const protocol = format.protocol ?? "https";

	return protocol === "https" || protocol === "http";
}

function shapeOf(format: RemoteFormat): StreamShape | null {
	if ((format.acodec ?? "").split(".")[0] !== "opus") return null;

	const ext = (format.ext ?? "").toLowerCase();
	if (ext === "webm") return "webm-opus";
	if (ext === "opus" || ext === "ogg") return "ogg-opus";

	return null;
}

function byBitrate(a: RemoteFormat, b: RemoteFormat): number {
	return (b.abr ?? 0) - (a.abr ?? 0);
}

export interface PlanOptions {
	ffmpeg: boolean;
	/** Set when the audio has to be filtered — a volume other than the track's own, or a seek — which only FFmpeg can do. */
	filtered?: boolean;
}

/**
 * The best format that can actually be played here.
 *
 * Opus at 48 kHz is what Discord wants, so a source that already offers it is passed straight through and
 * costs no CPU at all. Everything else needs FFmpeg, which is optional — without it those tracks are refused
 * by name rather than played as silence.
 */
export function planStream(formats: RemoteFormat[], options: PlanOptions): StreamPlan | null {
	const audio = formats.filter(isAudioOnly);

	if (options.filtered !== true) {
		const passthrough = audio
			.filter((format) => isProgressive(format) && shapeOf(format) !== null)
			.sort(byBitrate)
			.at(0);

		if (passthrough !== undefined) {
			return { formatId: passthrough.format_id, shape: shapeOf(passthrough)! };
		}
	}

	if (!options.ffmpeg) return null;

	// FFmpeg reads a pipe rather than the network, so a segmented format it would have to fetch itself is a last resort.
	const progressive = audio.filter(isProgressive).sort(byBitrate).at(0);
	const best = progressive ?? audio.sort(byBitrate).at(0);

	return best === undefined ? null : { formatId: best.format_id, shape: "transcode" };
}
