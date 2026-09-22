import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";
import { repoRoot } from "@core/paths";

/** Finding the two executables the player spawns, and saying plainly when one is missing. */

export interface MusicBinaries {
	/** Required: nothing can be resolved or streamed without it. */
	ytDlp: string | null;
	/** Optional: only a source that is not already Opus needs transcoding. */
	ffmpeg: string | null;
}

export type Probe = (path: string, args: string[]) => boolean;

/**
 * The flag each binary answers to.
 *
 * They disagree, and getting it wrong looks exactly like the binary being absent: `ffmpeg --version` exits 8
 * and `yt-dlp -version` exits 2, so one hardcoded flag silently hides one of the two on every machine.
 */
const VERSION_FLAG: Record<string, string> = { "yt-dlp": "--version", ffmpeg: "-version" };

/** Runs the candidate rather than stat-ing it, because a file that exists and will not execute is worse. */
export const runs: Probe = (path, args) => {
	const attempt = spawnSync(path, args, { encoding: "utf8", timeout: 10_000, windowsHide: true });

	return attempt.error === undefined && attempt.status === 0;
};

/**
 * Where the optional npm packages put their binaries.
 *
 * Both are `optionalDependencies`, so a machine that could not download one still installs everything else —
 * and this finds nothing rather than throwing.
 */
function packaged(name: string, executable: string, root: string): string[] {
	const inModules = (...segments: string[]): string => join(root, "node_modules", ...segments);

	if (name === "yt-dlp") return [inModules("youtube-dl-exec", "bin", executable)];
	if (name === "ffmpeg") return [inModules("ffmpeg-static", executable)];

	return [];
}

/**
 * Every place a binary might be, in the order a self-hoster would expect them to win.
 *
 * PATH beats the bundled copy deliberately: somebody who installed yt-dlp themselves keeps it current, and a
 * stale extractor is the commonest way music breaks.
 */
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

export function findBinaries(
	env: { MUSIC_YTDLP_PATH?: string | undefined; MUSIC_FFMPEG_PATH?: string | undefined },
	probe: Probe = runs,
): MusicBinaries {
	return {
		ytDlp: locate("yt-dlp", env.MUSIC_YTDLP_PATH, probe),
		ffmpeg: locate("ffmpeg", env.MUSIC_FFMPEG_PATH, probe),
	};
}
