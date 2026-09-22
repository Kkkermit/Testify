import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { findBinaries } from "../src/lib/musicBinaries.util";

/**
 * Fetches the yt-dlp the music player streams through.
 *
 * It is not an npm dependency on purpose: a postinstall that downloads a binary makes `npm ci` depend on
 * GitHub being reachable, and every job in CI runs one. This is opt-in instead, so a bot-only install never
 * pays for music and a broken download costs music rather than the whole bot.
 */

const RELEASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

const ASSETS: Record<string, string> = {
	linux: "yt-dlp_linux",
	darwin: "yt-dlp_macos",
	win32: "yt-dlp.exe",
};

async function main(): Promise<void> {
	const asset = ASSETS[process.platform];
	if (asset === undefined) {
		process.stderr.write(
			`No yt-dlp build is published for ${process.platform}. Install it yourself and set MUSIC_YTDLP_PATH.\n`,
		);
		process.exitCode = 1;
		return;
	}

	const directory = resolve(process.cwd(), "bin");
	const target = join(directory, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

	mkdirSync(directory, { recursive: true });
	process.stdout.write(`Downloading ${asset}…\n`);

	const response = await fetch(`${RELEASE}/${asset}`, { redirect: "follow" });
	if (!response.ok) throw new Error(`GitHub answered ${String(response.status)}`);

	writeFileSync(target, Buffer.from(await response.arrayBuffer()));
	if (process.platform !== "win32") chmodSync(target, 0o755);

	process.stdout.write(`Saved ${target}\n`);

	const fetched = findBinaries({ MUSIC_YTDLP_PATH: target });
	process.stdout.write(
		fetched.ytDlp === null
			? "Downloaded, but it would not run.\n"
			: `Verified: it runs (${String(fetched.ytDlpVersion)}).\n`,
	);

	// The bot runs the newest copy it can find, so say which one that is now rather than assume it is this one.
	const found = findBinaries({});
	process.stdout.write(
		found.ytDlp === null
			? ""
			: `The bot will use ${found.ytDlp} (${String(found.ytDlpVersion)}). Restart it to pick this up.\n`,
	);
	process.stdout.write(
		found.ffmpeg === null
			? "\nFFmpeg was not found. Most tracks still play; ones not already in Opus will not.\nInstall it with your package manager, or set MUSIC_FFMPEG_PATH.\n"
			: `\nFFmpeg found at ${found.ffmpeg}.\n`,
	);

	if (!existsSync(target)) process.exitCode = 1;
}

main().catch((error: unknown) => {
	process.stderr.write(`\nCould not set music up:\n\n${(error as Error).message}\n\n`);
	process.exitCode = 1;
});
