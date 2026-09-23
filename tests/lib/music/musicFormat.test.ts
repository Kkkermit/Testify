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

	/**
	 * A segmented stream is a playlist of parts, not a file. Passing its address off as one plays nothing,
	 * which is the shape of the original bug: a resolved track and a silent voice channel.
	 */
	it("does not pass a segmented stream off as a plain file", () => {
		const plan = planStream([format({ format_id: "hls-160", protocol: "m3u8_native" })], WITHOUT_FFMPEG);

		expect(plan).toBeNull();
	});

	it("transcodes an mp3-only track when FFmpeg is there", () => {
		const plan = planStream([format({ format_id: "mp3_0", acodec: "mp3", ext: "mp3" })], WITH_FFMPEG);

		expect(plan).toEqual({ formatId: "mp3_0", shape: "transcode" });
	});

	/** Refusing by name beats playing silence, which is what the old system did. */
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
