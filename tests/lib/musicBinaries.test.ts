import { candidatesFor, findBinaries, locate } from "@lib/musicBinaries.util";

describe("candidatesFor", () => {
	it("tries a configured path before anything on PATH", () => {
		expect(candidatesFor("yt-dlp", "/opt/yt-dlp", "/usr/bin")[0]).toBe("/opt/yt-dlp");
	});

	it("looks in every PATH entry", () => {
		const candidates = candidatesFor("yt-dlp", undefined, "/usr/bin:/usr/local/bin");

		expect(candidates).toContain("/usr/bin/yt-dlp");
		expect(candidates).toContain("/usr/local/bin/yt-dlp");
	});

	/** An empty PATH entry resolves to the working directory, which is not somewhere to look for a binary. */
	it("ignores empty PATH entries", () => {
		expect(candidatesFor("yt-dlp", undefined, "/usr/bin::")).toEqual(expect.not.arrayContaining(["yt-dlp/yt-dlp"]));
	});

	it("falls back to the local bin the setup script writes to", () => {
		expect(candidatesFor("yt-dlp", undefined, "").some((path) => path.includes("bin"))).toBe(true);
	});
});

describe("locate", () => {
	it("returns the first candidate that actually runs", () => {
		const found = locate("yt-dlp", "/opt/broken", (path) => path === "/usr/bin/yt-dlp");

		expect(found).toBe("/usr/bin/yt-dlp");
	});

	/**
	 * A file that exists and will not execute is worse than a missing one: it fails later, in a voice channel,
	 * with nothing to point at. The probe runs the candidate rather than stat-ing it.
	 */
	it("reports nothing when no candidate runs", () => {
		expect(locate("yt-dlp", "/opt/broken", () => false)).toBeNull();
	});
});

describe("findBinaries", () => {
	it("looks for both, and says which is missing", () => {
		const found = findBinaries({ MUSIC_YTDLP_PATH: "/a/yt-dlp" }, (path) => path === "/a/yt-dlp");

		expect(found).toEqual({ ytDlp: "/a/yt-dlp", ffmpeg: null });
	});

	/** FFmpeg being absent is a supported state, not a failure — most tracks still play without it. */
	it("does not treat a missing FFmpeg as fatal", () => {
		expect(() => findBinaries({}, () => false)).not.toThrow();
		expect(findBinaries({}, () => false)).toEqual({ ytDlp: null, ffmpeg: null });
	});
});
