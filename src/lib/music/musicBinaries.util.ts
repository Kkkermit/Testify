import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";
import { repoRoot } from "@core/paths";
import { type MusicBinaries } from "@lib/music/music.types";

/** Finding the two executables the player spawns, and saying plainly when one is missing. */

export type Probe = (path: string, args: string[]) => boolean;

/** The first line a binary prints for its version, or null when it would not run. */
export type VersionProbe = (path: string) => string | null;

/** YouTube changes often enough that an extractor older than this is the likeliest cause of a 403. */
export const STALE_AFTER_DAYS = 30;

/** The flags differ: `ffmpeg --version` exits 8 and `yt-dlp -version` exits 2. */
const VERSION_FLAG: Record<string, string> = { "yt-dlp": "--version", ffmpeg: "-version" };

/** Runs the candidate rather than stat-ing it, because a file that exists and will not execute is worse. */
export const runs: Probe = (path, args) => {
	const attempt = spawnSync(path, args, { encoding: "utf8", timeout: 10_000, windowsHide: true });

	return attempt.error === undefined && attempt.status === 0;
};

/** Where the optional npm packages put their binaries; nothing is found when one could not install. */
function packaged(name: string, executable: string, root: string): string[] {
	const inModules = (...segments: string[]): string => join(root, "node_modules", ...segments);

	if (name === "yt-dlp") return [inModules("youtube-dl-exec", "bin", executable)];
	if (name === "ffmpeg") return [inModules("ffmpeg-static", executable)];

	return [];
}

/** Every place a binary might be, in precedence order; for yt-dlp only the tie-break, since the newest runs. */
export function candidatesFor(
	name: string,
	configured: string | undefined,
	pathVar = process.env.PATH ?? "",
	root = repoRoot(),
): string[] {
	const executables = process.platform === "win32" ? [`${name}.exe`, name] : [name];
	const onPath = pathVar
		.split(delimiter)
		.filter((entry) => entry !== "")
		.flatMap((entry) => executables.map((executable) => join(entry, executable)));

	return [
		...(configured === undefined ? [] : [configured]),
		...onPath,
		...executables.flatMap((executable) => packaged(name, executable, root)),
		// Resolved from the repository rather than the working directory, which a start script can change.
		...executables.map((executable) => join(root, "bin", executable)),
	];
}

export function locate(name: string, configured: string | undefined, probe: Probe = runs): string | null {
	const args = [VERSION_FLAG[name] ?? "--version"];

	return candidatesFor(name, configured).find((candidate) => probe(candidate, args)) ?? null;
}

export const readVersion: VersionProbe = (path) => {
	const attempt = spawnSync(path, [VERSION_FLAG["yt-dlp"] ?? "--version"], {
		encoding: "utf8",
		timeout: 10_000,
		windowsHide: true,
	});
	if (attempt.error !== undefined || attempt.status !== 0) return null;

	const first = attempt.stdout.trim().split("\n")[0]?.trim() ?? "";

	return first === "" ? null : first;
};

/** yt-dlp versions are release dates — `2026.09.15`, sometimes with a fourth part — so they sort as dates do. */
export function releaseDateOf(version: string): Date | null {
	const match = /^(\d{4})\.(\d{1,2})\.(\d{1,2})/.exec(version.trim());
	if (match === null) return null;

	const [, year = "", month = "", day = ""] = match;
	const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

	return Number.isNaN(date.getTime()) ? null : date;
}

function versionKey(version: string): string {
	const parts = version
		.trim()
		.split(".")
		.map((part) => part.padStart(6, "0"));

	return parts.join(".");
}

/** Whole days since the release, or null for a version that is not a date. */
export function ageInDays(version: string, now = Date.now()): number | null {
	const released = releaseDateOf(version);
	if (released === null) return null;

	return Math.max(0, Math.floor((now - released.getTime()) / 86_400_000));
}

export interface Found {
	path: string;
	version: string;
}

/** The newest that runs; on a tie the earlier candidate keeps its place, so the lookup order still means something. */
export function pickNewest(found: Found[]): Found | null {
	let best: Found | null = null;

	for (const candidate of found) {
		if (best === null || versionKey(candidate.version) > versionKey(best.version)) best = candidate;
	}

	return best;
}

/** A configured path wins outright; otherwise the newest copy that runs, wherever it lives. */
export function locateYtDlp(
	configured: string | undefined,
	version: VersionProbe = readVersion,
	pathVar = process.env.PATH ?? "",
	root = repoRoot(),
): Found | null {
	if (configured !== undefined) {
		const own = version(configured);
		if (own !== null) return { path: configured, version: own };
	}

	const found = candidatesFor("yt-dlp", undefined, pathVar, root).flatMap((path) => {
		const reported = version(path);
		return reported === null ? [] : [{ path, version: reported }];
	});

	return pickNewest(found);
}

export function findBinaries(
	env: { MUSIC_YTDLP_PATH?: string | undefined; MUSIC_FFMPEG_PATH?: string | undefined },
	probes: { runs?: Probe; version?: VersionProbe } = {},
): MusicBinaries {
	const ytDlp = locateYtDlp(env.MUSIC_YTDLP_PATH, probes.version);

	return {
		ytDlp: ytDlp?.path ?? null,
		ffmpeg: locate("ffmpeg", env.MUSIC_FFMPEG_PATH, probes.runs),
		ytDlpVersion: ytDlp?.version ?? null,
	};
}

/** What `/music status` says: where each binary is, how old the extractor is, and what to do about it. */
export function statusLines(found: MusicBinaries, now = Date.now()): string[] {
	const lines: string[] = [];
	const version = found.ytDlpVersion ?? null;
	const age = version === null ? null : ageInDays(version, now);

	if (found.ytDlp === null) {
		lines.push("✗ **yt-dlp** — not found. Run `npm run music:setup` on the host.");
	} else {
		const aged = version === null ? "" : ` ${version}${age === null ? "" : ` (${String(age)} days old)`}`;
		lines.push(`✓ **yt-dlp**${aged} — \`${found.ytDlp}\``);
	}

	lines.push(found.ffmpeg === null ? "✗ **FFmpeg** — not found" : `✓ **FFmpeg** — \`${found.ffmpeg}\``);

	if (age !== null && age > STALE_AFTER_DAYS) {
		lines.push(
			"-# ⚠️ YouTube changes often, and an extractor this old is the usual cause of `HTTP Error 403`. Run `npm run music:setup` on the host, then restart the bot.",
		);
	}

	if (found.ffmpeg === null) {
		lines.push("-# Without FFmpeg, tracks not already in Opus cannot play and the volume cannot be changed.");
	}

	return lines;
}
