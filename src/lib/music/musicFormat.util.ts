import { MAX_VOLUME, MIN_VOLUME, UNITY_VOLUME } from "@lib/music/music.constants";
import { type RemoteFormat, type StreamShape, type StreamPlan } from "@lib/music/music.types";
/** Choosing which of a track's formats to play, and whether that choice needs a transcoder. */

export function clampVolume(volume: number): number {
	if (!Number.isFinite(volume)) return UNITY_VOLUME;

	return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(volume)));
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

function bitrateOf(format: RemoteFormat): number {
	return format.abr ?? format.tbr ?? 0;
}

/**
 * Highest bitrate first; where none is stated, yt-dlp's own order decides, and it lists formats worst to best, so the
 * later one wins rather than the first — which would be the lowest quality on offer.
 */
function bestFirst(formats: RemoteFormat[]): RemoteFormat[] {
	return formats
		.map((format, position) => ({ format, position }))
		.sort((a, b) => bitrateOf(b.format) - bitrateOf(a.format) || b.position - a.position)
		.map(({ format }) => format);
}

export interface PlanOptions {
	ffmpeg: boolean;
	/** Set when the audio has to be filtered — a volume other than the track's own, or a seek — which only FFmpeg can do. */
	filtered?: boolean;
}

/** The best playable format: Opus passes straight through, and anything else needs FFmpeg or is refused by name. */
export function planStream(formats: RemoteFormat[], options: PlanOptions): StreamPlan | null {
	const audio = formats.filter(isAudioOnly);

	if (options.filtered !== true) {
		const passthrough = bestFirst(audio.filter((format) => isProgressive(format) && shapeOf(format) !== null)).at(0);

		if (passthrough !== undefined) {
			return { formatId: passthrough.format_id, shape: shapeOf(passthrough)! };
		}
	}

	if (!options.ffmpeg) return null;

	// FFmpeg reads a pipe rather than the network, so a segmented format it would have to fetch itself is a last resort.
	const progressive = bestFirst(audio.filter(isProgressive)).at(0);
	const best = progressive ?? bestFirst(audio).at(0);

	return best === undefined ? null : { formatId: best.format_id, shape: "transcode" };
}
