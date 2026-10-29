import { delimiter, isAbsolute, join } from "node:path";
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

/** The file name the lookup tries first on this system, so the expectations hold on Windows too. */
const exe = (name: string): string => (process.platform === "win32" ? `${name}.exe` : name);

describe("candidatesFor", () => {
	it("tries a configured path first, then every PATH entry", () => {
		const candidates = candidatesFor("yt-dlp", "/opt/yt-dlp", ["/usr/bin", "/usr/local/bin"].join(delimiter));

		expect(candidates[0]).toBe("/opt/yt-dlp");
		expect(candidates).toContain(join("/usr/bin", exe("yt-dlp")));
		expect(candidates).toContain(join("/usr/local/bin", exe("yt-dlp")));
	});

	/** Anti-pattern 13: an empty PATH entry or a relative bin would look wherever a start script left the cwd. */
	it("never looks relative to the working directory", () => {
		const candidates = candidatesFor("yt-dlp", undefined, ["/usr/bin", "", ""].join(delimiter), "/repo");

		expect(candidates.filter((candidate) => !isAbsolute(candidate))).toEqual([]);
		expect(candidates).toContain(join("/repo", "bin", exe("yt-dlp")));
	});

	it.each([
		["yt-dlp", join("/repo", "node_modules", "youtube-dl-exec", "bin", exe("yt-dlp"))],
		["ffmpeg", join("/repo", "node_modules", "ffmpeg-static", exe("ffmpeg"))],
	])("finds %s where its optional npm package puts it", (name, expected) => {
		expect(candidatesFor(name, undefined, "", "/repo")).toContain(expected);
	});

	/** A copy on PATH beats the bundled one when both are the same release. */
	it("prefers one on PATH over the bundled copy", () => {
		const candidates = candidatesFor("yt-dlp", undefined, "/usr/bin", "/repo");

		expect(candidates.indexOf(join("/usr/bin", exe("yt-dlp")))).toBeLessThan(
			candidates.indexOf(join("/repo", "node_modules", "youtube-dl-exec", "bin", exe("yt-dlp"))),
		);
	});
});

describe("locate", () => {
	it("returns the first candidate that actually runs", () => {
		const second = candidatesFor("yt-dlp", "/opt/broken")[1];

		expect(locate("yt-dlp", "/opt/broken", (path) => path !== "/opt/broken")).toBe(second);
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

		expect(found?.path).toBe(join("/usr/bin", exe("yt-dlp")));
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

	/** Node itself is the picky binary: it exits 0 for `--version` and 9 for `-version`, on every system. */
	it("passes the flag through to the process rather than dropping it", () => {
		const node = process.execPath;

		expect(runs(node, ["--version"])).toBe(true);
		expect(runs(node, ["-version"])).toBe(false);
		expect(locate("yt-dlp", node)).toBe(node);
		// A configured path that fails the probe falls through to PATH; this one was rejected.
		expect(locate("ffmpeg", node)).not.toBe(node);
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
