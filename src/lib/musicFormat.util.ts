/** Choosing which of a track's formats to play, and whether that choice needs a transcoder. */

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

/**
 * The best format that can actually be played here.
 *
 * Opus at 48 kHz is what Discord wants, so a source that already offers it is passed straight through and
 * costs no CPU at all. Everything else needs FFmpeg, which is optional — without it those tracks are refused
 * by name rather than played as silence.
 */
export function planStream(formats: RemoteFormat[], options: { ffmpeg: boolean }): StreamPlan | null {
	const audio = formats.filter(isAudioOnly);

	const passthrough = audio
		.filter((format) => isProgressive(format) && shapeOf(format) !== null)
		.sort(byBitrate)
		.at(0);

	if (passthrough !== undefined) {
		return { formatId: passthrough.format_id, shape: shapeOf(passthrough)! };
	}

	if (!options.ffmpeg) return null;

	const best = audio.sort(byBitrate).at(0);

	return best === undefined ? null : { formatId: best.format_id, shape: "transcode" };
}
