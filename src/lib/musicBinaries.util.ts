import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";

/** Finding the two executables the player spawns, and saying plainly when one is missing. */

export interface MusicBinaries {
	/** Required: nothing can be resolved or streamed without it. */
	ytDlp: string | null;
	/** Optional: only a source that is not already Opus needs transcoding. */
	ffmpeg: string | null;
}

export type Probe = (path: string) => boolean;

/** Runs the candidate rather than stat-ing it, because a file that exists and will not execute is worse. */
export const runs: Probe = (path) => {
	const attempt = spawnSync(path, ["--version"], { encoding: "utf8", timeout: 10_000, windowsHide: true });

	return attempt.error === undefined && attempt.status === 0;
};

/** Every place a binary might be, in the order a self-hoster would expect them to win. */
export function candidatesFor(
	name: string,
	configured: string | undefined,
	pathVar = process.env.PATH ?? "",
): string[] {
	const executables = process.platform === "win32" ? [`${name}.exe`, name] : [name];
	const onPath = pathVar
		.split(delimiter)
		.filter((entry) => entry !== "")
		.flatMap((entry) => executables.map((executable) => join(entry, executable)));

	return [...(configured === undefined ? [] : [configured]), ...onPath, ...executables.map((e) => join("bin", e))];
}

export function locate(name: string, configured: string | undefined, probe: Probe = runs): string | null {
	return candidatesFor(name, configured).find((candidate) => probe(candidate)) ?? null;
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
