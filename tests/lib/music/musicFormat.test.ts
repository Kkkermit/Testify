import { MAX_VOLUME, MIN_VOLUME, UNITY_VOLUME } from "@lib/music/music.constants";
import { type RemoteFormat } from "@lib/music/music.types";
import { clampVolume, planStream } from "@lib/music/musicFormat.util";

function format(overrides: Partial<RemoteFormat> & { format_id: string }): RemoteFormat {
	return { acodec: "opus", vcodec: "none", ext: "webm", protocol: "https", abr: 160, ...overrides };
}

const WITH_FFMPEG = { ffmpeg: true };
const WITHOUT_FFMPEG = { ffmpeg: false };

describe("planStream", () => {
	/** Opus at 48 kHz is what Discord wants, so a source already offering it must never be re-encoded. */
	it("passes YouTube's WebM/Opus straight through", () => {
		expect(planStream([format({ format_id: "251" })], WITHOUT_FFMPEG)).toEqual({
			formatId: "251",
			shape: "webm-opus",
		});
	});

	it.each(["opus", "ogg"])("passes a progressive .%s file straight through", (ext) => {
		expect(planStream([format({ format_id: "hls_opus", ext })], WITHOUT_FFMPEG)).toEqual({
			formatId: "hls_opus",
			shape: "ogg-opus",
		});
	});

	it("takes the highest bitrate when several would do", () => {
		const plan = planStream(
			[format({ format_id: "low", abr: 64 }), format({ format_id: "high", abr: 160 })],
			WITHOUT_FFMPEG,
		);

		expect(plan).toMatchObject({ formatId: "high" });
	});

	/** A video stream would carry a whole picture track into a voice channel. */
	it("ignores anything carrying video", () => {
		const plan = planStream([format({ format_id: "18", vcodec: "avc1", ext: "mp4" })], WITHOUT_FFMPEG);

		expect(plan).toBeNull();
	});

	it("ignores a format with no audio at all", () => {
		expect(planStream([format({ format_id: "x", acodec: "none" })], WITHOUT_FFMPEG)).toBeNull();
	});

	/** A segmented stream is not passed off as a plain file. */
	it("does not pass a segmented stream off as a plain file", () => {
		const plan = planStream([format({ format_id: "hls-160", protocol: "m3u8_native" })], WITHOUT_FFMPEG);

		expect(plan).toBeNull();
	});

	it("transcodes an mp3-only track when FFmpeg is there", () => {
		const plan = planStream([format({ format_id: "mp3_0", acodec: "mp3", ext: "mp3" })], WITH_FFMPEG);

		expect(plan).toEqual({ formatId: "mp3_0", shape: "transcode" });
	});

	/** Refusing by name beats playing silence. */
	it("refuses an mp3-only track when FFmpeg is missing", () => {
		expect(planStream([format({ format_id: "mp3_0", acodec: "mp3", ext: "mp3" })], WITHOUT_FFMPEG)).toBeNull();
	});

	it("still prefers passthrough when FFmpeg is available", () => {
		const plan = planStream(
			[format({ format_id: "mp3_0", acodec: "mp3", ext: "mp3", abr: 320 }), format({ format_id: "251", abr: 160 })],
			WITH_FFMPEG,
		);

		expect(plan).toEqual({ formatId: "251", shape: "webm-opus" });
	});

	it("reads a codec string carrying a profile", () => {
		expect(planStream([format({ format_id: "251", acodec: "opus.1" })], WITHOUT_FFMPEG)).toMatchObject({
			shape: "webm-opus",
		});
	});

	it.each([[[] as RemoteFormat[]], [[format({ format_id: "v", vcodec: "avc1", acodec: "none" })]]])(
		"returns nothing for %p",
		(formats) => {
			expect(planStream(formats, WITH_FFMPEG)).toBeNull();
		},
	);
});

describe("planStream with no bitrate stated", () => {
	/** yt-dlp lists formats worst first, so a stable sort over missing bitrates used to take the worst one on offer. */
	it("takes the last listed rather than the first when no format says its bitrate", () => {
		const formats = [
			{ format_id: "worst", acodec: "opus", vcodec: "none", ext: "webm", protocol: "https" },
			{ format_id: "best", acodec: "opus", vcodec: "none", ext: "webm", protocol: "https" },
		];

		expect(planStream(formats, { ffmpeg: false })?.formatId).toBe("best");
	});

	it("reads the total bitrate when the audio bitrate is missing", () => {
		const formats = [
			{ format_id: "high", acodec: "mp3", vcodec: "none", ext: "mp3", protocol: "https", tbr: 256 },
			{ format_id: "low", acodec: "mp3", vcodec: "none", ext: "mp3", protocol: "https", tbr: 64 },
		];

		expect(planStream(formats, { ffmpeg: true })?.formatId).toBe("high");
	});

	it("still lets a stated bitrate beat the listing order", () => {
		const formats = [
			{ format_id: "stated-high", acodec: "opus", vcodec: "none", ext: "webm", protocol: "https", abr: 160 },
			{ format_id: "stated-low", acodec: "opus", vcodec: "none", ext: "webm", protocol: "https", abr: 50 },
		];

		expect(planStream(formats, { ffmpeg: false })?.formatId).toBe("stated-high");
	});
});

describe("clampVolume", () => {
	it("keeps a sensible level as it is", () => {
		expect(clampVolume(80)).toBe(80);
	});

	it("holds the ends rather than letting a press run past them", () => {
		expect(clampVolume(MAX_VOLUME + 50)).toBe(MAX_VOLUME);
		expect(clampVolume(MIN_VOLUME - 50)).toBe(MIN_VOLUME);
	});

	/** A custom ID is text, so a hand-written one can arrive as NaN and must not become a NaN filter. */
	it("falls back to the track's own level for a number that is not one", () => {
		expect(clampVolume(Number.NaN)).toBe(UNITY_VOLUME);
	});

	it("rounds, because FFmpeg is handed a percentage rather than a fraction", () => {
		expect(clampVolume(80.6)).toBe(81);
	});
});

describe("planStream when the audio has to be filtered", () => {
	const OPUS = { format_id: "251", acodec: "opus", vcodec: "none", ext: "webm", protocol: "https", abr: 160 };

	/** Passthrough is bytes moved untouched, so a volume filter cannot be applied to it. */
	it("refuses to pass Opus through, because a filter needs a transcoder", () => {
		expect(planStream([OPUS], { ffmpeg: true, filtered: true })).toEqual({ formatId: "251", shape: "transcode" });
	});

	it("passes the same format through untouched when nothing has to be filtered", () => {
		expect(planStream([OPUS], { ffmpeg: true })).toEqual({ formatId: "251", shape: "webm-opus" });
	});

	it("has nothing to offer without FFmpeg", () => {
		expect(planStream([OPUS], { ffmpeg: false, filtered: true })).toBeNull();
	});

	/** FFmpeg reads a pipe rather than the network, so a segmented format it would have to fetch itself is worse. */
	it("prefers a plain file over a segmented one even when the segmented one is louder", () => {
		const hls = { format_id: "hls", acodec: "aac", vcodec: "none", ext: "m4a", protocol: "m3u8_native", abr: 256 };
		const file = { format_id: "file", acodec: "aac", vcodec: "none", ext: "m4a", protocol: "https", abr: 128 };

		expect(planStream([hls, file], { ffmpeg: true, filtered: true })?.formatId).toBe("file");
	});
});

describe("planStream with dubbed audio", () => {
	// yt-dlp ranks the voices: 10 for the original, 5 for the default, -1 for another dub and -10 for a described one.
	const DUB = format({ format_id: "251-0", abr: 140, language_preference: 5 });
	const LOUDER_DUB = format({ format_id: "251-2", abr: 170, language_preference: -1 });
	const ORIGINAL = format({ format_id: "251-1", abr: 128, language_preference: 10 });

	/** A dubbed video lists every voice, and the highest bitrate was a machine-translated one. */
	it("plays the original voice even when a dub is a higher bitrate", () => {
		expect(planStream([DUB, LOUDER_DUB, ORIGINAL], WITHOUT_FFMPEG)?.formatId).toBe("251-1");
	});

	it("keeps the original voice when the volume means transcoding", () => {
		const original = format({ format_id: "140-1", acodec: "mp4a.40.2", ext: "m4a", language_preference: 10 });

		expect(planStream([LOUDER_DUB, original], { ffmpeg: true, filtered: true })?.formatId).toBe("140-1");
	});

	it("takes the default voice when none is marked as the original", () => {
		expect(planStream([LOUDER_DUB, DUB], WITHOUT_FFMPEG)?.formatId).toBe("251-0");
	});

	/** Playing the dub beats playing nothing, when the original is only offered in a shape this host cannot play. */
	it("falls back to another voice rather than refusing the track", () => {
		const original = format({ format_id: "140-1", acodec: "mp4a.40.2", ext: "m4a", language_preference: 10 });

		expect(planStream([original, DUB], WITHOUT_FFMPEG)?.formatId).toBe("251-0");
	});
});
