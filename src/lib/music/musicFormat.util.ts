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

function byBitrate(a: RemoteFormat, b: RemoteFormat): number {
	return (b.abr ?? 0) - (a.abr ?? 0);
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
