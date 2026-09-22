import { planStream, type RemoteFormat } from "@lib/musicFormat.util";

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
