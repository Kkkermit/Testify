import { explainPlaybackFailure } from "@lib/music.util";
import { ProgressiveSoundCloudPlugin, YTDLP_AUDIO_FORMAT } from "@lib/musicPlugins.util";

/**
 * SoundCloud now serves a DRM-protected (`/cbcs/`) HLS transcoding first, which
 * FFmpeg downloads and then decodes as garbage — the queue ends with no audio and
 * hundreds of AAC errors. These cover the choice of transcoding, which is the
 * whole fix.
 */

const PROGRESSIVE = {
	url: "https://api.soundcloud.com/media/x/stream/progressive",
	format: { protocol: "progressive" },
};
const ENCRYPTED_HLS = {
	url: "https://playback.media-streaming.soundcloud.cloud/cbcs/x/aac_160k/y",
	format: { protocol: "hls" },
};
const PLAIN_HLS = { url: "https://api.soundcloud.com/media/x/stream/hls", format: { protocol: "hls" } };

function pluginWith(transcodings: unknown[], link = "https://cdn.test/final.mp3") {
	const plugin = new ProgressiveSoundCloudPlugin();
	const chosen: unknown[] = [];

	(plugin as unknown as { soundcloud: unknown }).soundcloud = {
		util: {
			sortTranscodings: () => Promise.resolve(transcodings),
			getStreamLink: (transcoding: unknown) => {
				chosen.push(transcoding);
				return Promise.resolve(link);
			},
		},
	};

	return { plugin, chosen };
}

describe("ProgressiveSoundCloudPlugin", () => {
	it("picks the progressive transcoding over the encrypted one", async () => {
		const { plugin, chosen } = pluginWith([ENCRYPTED_HLS, PROGRESSIVE]);

		await plugin.getStreamURL({ url: "https://soundcloud.com/a/b" });

		expect(chosen[0]).toBe(PROGRESSIVE);
	});

	it("returns the resolved stream link", async () => {
		const { plugin } = pluginWith([PROGRESSIVE]);
		expect(await plugin.getStreamURL({ url: "https://soundcloud.com/a/b" })).toBe("https://cdn.test/final.mp3");
	});

	/** Older tracks may have no progressive rendition, but unencrypted HLS still plays. */
	it("falls back to an unencrypted HLS stream when there is no progressive one", async () => {
		const { plugin, chosen } = pluginWith([ENCRYPTED_HLS, PLAIN_HLS]);

		await plugin.getStreamURL({ url: "https://soundcloud.com/a/b" });

		expect(chosen[0]).toBe(PLAIN_HLS);
	});

	it("never picks an encrypted transcoding, even as the only option", async () => {
		const { plugin } = pluginWith([ENCRYPTED_HLS]);

		await expect(plugin.getStreamURL({ url: "https://soundcloud.com/a/b" })).rejects.toThrow(/DRM/i);
	});

	it("treats cenc as encrypted too, not just cbcs", async () => {
		const { plugin } = pluginWith([{ url: "https://x/cenc/y", format: { protocol: "hls" } }]);

		await expect(plugin.getStreamURL({ url: "https://soundcloud.com/a/b" })).rejects.toThrow(/DRM/i);
	});

	it("rejects a song with no URL rather than calling out", async () => {
		const { plugin } = pluginWith([PROGRESSIVE]);
		await expect(plugin.getStreamURL({})).rejects.toThrow(/invalid song/i);
	});

	it("explains a refused stream request instead of returning an empty URL", async () => {
		const { plugin } = pluginWith([PROGRESSIVE], "");
		await expect(plugin.getStreamURL({ url: "https://soundcloud.com/a/b" })).rejects.toThrow(/try again/i);
	});
});

describe("YTDLP_AUDIO_FORMAT", () => {
	it("asks for plain HTTPS audio first", () => {
		expect(YTDLP_AUDIO_FORMAT.startsWith("ba[protocol=https]")).toBe(true);
	});

	/** The tail matters: a track with no https-only rendition must still resolve. */
	it("keeps the original selector as a fallback, so nothing becomes unplayable", () => {
		expect(YTDLP_AUDIO_FORMAT.endsWith("ba/ba*")).toBe(true);
	});
});

describe("explainPlaybackFailure on a DRM stream", () => {
	it.each([
		"https://playback.media-streaming.soundcloud.cloud/cbcs/x/aac_160k/y",
		"[aac @ 0x1] Reserved bit set.",
		"[aac @ 0x1] Number of bands (21) exceeds limit (19).",
		"[aac @ 0x1] channel element 3.12 is not allocated",
		"[aac @ 0x1] invalid band type",
	])("names DRM for %p", (line) => {
		expect(explainPlaybackFailure(new Error(line))).toMatch(/DRM/i);
	});
});
