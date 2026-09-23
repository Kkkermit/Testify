import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	ageInDays,
	candidatesFor,
	findBinaries,
	locate,
	locateYtDlp,
	pickNewest,
	runs,
	statusLines,
} from "@lib/music/musicBinaries.util";

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

	/** A copy on PATH beats the bundled one when both are the same release. */
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

	/** A candidate that exists but will not run counts as missing. */
	it("reports nothing when no candidate runs", () => {
		expect(locate("yt-dlp", "/opt/broken", () => false)).toBeNull();
	});
});

describe("findBinaries", () => {
	it("looks for both, and says which is missing", () => {
		const found = findBinaries(
			{ MUSIC_YTDLP_PATH: "/a/yt-dlp" },
			{ runs: () => false, version: (path) => (path === "/a/yt-dlp" ? "2026.09.01" : null) },
		);

		expect(found).toEqual({ ytDlp: "/a/yt-dlp", ffmpeg: null, ytDlpVersion: "2026.09.01" });
	});

	/** FFmpeg being absent is a supported state, not a failure — most tracks still play without it. */
	it("does not treat a missing FFmpeg as fatal", () => {
		const nothing = { runs: () => false, version: () => null };

		expect(() => findBinaries({}, nothing)).not.toThrow();
		expect(findBinaries({}, nothing)).toEqual({ ytDlp: null, ffmpeg: null, ytDlpVersion: null });
	});
});

describe("locateYtDlp", () => {
	/** The newest copy runs wherever it lives, so `npm run music:setup` takes effect. */
	it("runs the newest copy wherever it lives", () => {
		const versions: Record<string, string> = {
			[join("/repo", "node_modules", "youtube-dl-exec", "bin", "yt-dlp")]: "2026.05.01",
			[join("/repo", "bin", "yt-dlp")]: "2026.09.15",
		};
		const found = locateYtDlp(undefined, (path) => versions[path] ?? null, "", "/repo");

		expect(found).toEqual({ path: join("/repo", "bin", "yt-dlp"), version: "2026.09.15" });
	});

	it("keeps the lookup order on a tie, so PATH still beats the bundled copy", () => {
		const found = locateYtDlp(undefined, () => "2026.09.15", "/usr/bin", "/repo");

		expect(found?.path).toBe(join("/usr/bin", "yt-dlp"));
	});

	/** An explicit setting is an explicit choice, however old the file it names. */
	it("runs a configured path even when a newer one exists", () => {
		const found = locateYtDlp("/opt/old", (path) => (path === "/opt/old" ? "2025.01.01" : "2026.09.15"));

		expect(found).toEqual({ path: "/opt/old", version: "2025.01.01" });
	});

	it("falls back to the search when the configured path does not run", () => {
		expect(locateYtDlp("/opt/broken", (path) => (path === "/opt/broken" ? null : "2026.09.15"))?.path).not.toBe(
			"/opt/broken",
		);
	});
});

describe("pickNewest", () => {
	it("compares a same-day rebuild as newer than the release it follows", () => {
		expect(
			pickNewest([
				{ path: "a", version: "2026.09.15" },
				{ path: "b", version: "2026.09.15.1" },
			])?.path,
		).toBe("b");
	});

	/** Compared as text, "2026.9.3" sorts after "2026.10.1"; padded, it does not. */
	it("does not let an unpadded month sort as a later release", () => {
		expect(
			pickNewest([
				{ path: "october", version: "2026.10.01" },
				{ path: "september", version: "2026.9.3" },
			])?.path,
		).toBe("october");
	});

	it("has nothing to pick from nothing", () => {
		expect(pickNewest([])).toBeNull();
	});
});

describe("ageInDays", () => {
	it("counts whole days since the release", () => {
		expect(ageInDays("2026.09.01", Date.UTC(2026, 8, 22, 12))).toBe(21);
	});

	it("says nothing about a version that is not a date", () => {
		expect(ageInDays("nightly")).toBeNull();
	});

	it("never reports a release from the future as a negative age", () => {
		expect(ageInDays("2026.12.31", Date.UTC(2026, 8, 22))).toBe(0);
	});
});

describe("the version probe", () => {
	/** Each binary is asked for its version with its own flag. */
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
			// A configured path that fails the probe falls through to PATH; this one was rejected.
			expect(locate("yt-dlp", picky)).not.toBe(picky);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});

describe("statusLines", () => {
	const NOW = Date.UTC(2026, 8, 22);

	it("names the version and its age beside the path", () => {
		const lines = statusLines({ ytDlp: "/bin/yt-dlp", ffmpeg: "/bin/ffmpeg", ytDlpVersion: "2026.09.15" }, NOW);

		expect(lines[0]).toContain("2026.09.15 (7 days old)");
	});

	/** A 403 from YouTube looks like a bug in the bot; this is the line that says it is the extractor's age. */
	it("warns about an old extractor and says how to replace it", () => {
		const text = statusLines({ ytDlp: "/bin/yt-dlp", ffmpeg: "/bin/ffmpeg", ytDlpVersion: "2026.05.01" }, NOW).join(
			"\n",
		);

		expect(text).toContain("403");
		expect(text).toContain("npm run music:setup");
	});

	it("does not nag about a recent one", () => {
		const text = statusLines({ ytDlp: "/bin/yt-dlp", ffmpeg: "/bin/ffmpeg", ytDlpVersion: "2026.09.15" }, NOW).join(
			"\n",
		);

		expect(text).not.toContain("403");
	});

	it("says what a missing FFmpeg costs", () => {
		expect(statusLines({ ytDlp: null, ffmpeg: null }, NOW).join("\n")).toContain("volume cannot be changed");
	});
});
