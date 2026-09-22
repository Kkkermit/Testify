import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { candidatesFor, findBinaries, locate, runs } from "@lib/musicBinaries.util";

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
		expect(candidatesFor("yt-dlp", undefined, "", "/repo")).toContain("/repo/bin/yt-dlp");
	});

	/** Anti-pattern 13: a working directory a start script changed would look for the binary somewhere else. */
	it("resolves the local bin from the repository, never the working directory", () => {
		for (const candidate of candidatesFor("yt-dlp", undefined, "", "/repo")) {
			expect(candidate.startsWith("bin/")).toBe(false);
		}
	});

	it.each([
		["yt-dlp", "/repo/node_modules/youtube-dl-exec/bin/yt-dlp"],
		["ffmpeg", "/repo/node_modules/ffmpeg-static/ffmpeg"],
	])("finds %s where its optional npm package puts it", (name, expected) => {
		expect(candidatesFor(name, undefined, "", "/repo")).toContain(expected);
	});

	/**
	 * Somebody who installed yt-dlp themselves keeps it current; the bundled copy is pinned at install time,
	 * and a stale extractor is the commonest way music breaks.
	 */
	it("prefers one on PATH over the bundled copy", () => {
		const candidates = candidatesFor("yt-dlp", undefined, "/usr/bin", "/repo");

		expect(candidates.indexOf("/usr/bin/yt-dlp")).toBeLessThan(
			candidates.indexOf("/repo/node_modules/youtube-dl-exec/bin/yt-dlp"),
		);
	});

	it("prefers an explicitly configured path over everything", () => {
		expect(candidatesFor("yt-dlp", "/opt/mine", "/usr/bin", "/repo")[0]).toBe("/opt/mine");
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

describe("the version probe", () => {
	/**
	 * The two binaries disagree about the flag, and getting it wrong is indistinguishable from the binary being
	 * absent: `ffmpeg --version` exits 8 and `yt-dlp -version` exits 2. One hardcoded flag hid FFmpeg entirely.
	 */
	it("asks each binary for its version the way that binary expects", () => {
		const asked: Record<string, string[]> = {};
		const probe = (path: string, args: string[]): boolean => {
			asked[path] = args;
			return false;
		};

		locate("ffmpeg", "/x/ffmpeg", probe);
		locate("yt-dlp", "/x/yt-dlp", probe);

		expect(asked["/x/ffmpeg"]).toEqual(["-version"]);
		expect(asked["/x/yt-dlp"]).toEqual(["--version"]);
	});

	it("passes the flag through to the process rather than dropping it", () => {
		const directory = mkdtempSync(join(tmpdir(), "testify-probe-"));
		const picky = join(directory, "picky");
		// Exits 0 only for `-version`, which is exactly how the real FFmpeg behaves.
		writeFileSync(picky, '#!/bin/sh\n[ "$1" = "-version" ] && exit 0\nexit 8\n', { mode: 0o755 });

		try {
			expect(runs(picky, ["-version"])).toBe(true);
			expect(runs(picky, ["--version"])).toBe(false);
			expect(locate("ffmpeg", picky)).toBe(picky);
			// Not null: a configured path that fails the probe correctly falls through to PATH, where a real
			// yt-dlp may well be. What matters is that this one was rejected.
			expect(locate("yt-dlp", picky)).not.toBe(picky);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});
