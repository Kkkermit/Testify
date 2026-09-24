import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { findBinaries } from "../src/lib/music/musicBinaries.util";
import { box, painter, stepLine } from "@core/terminal";

/** Fetches yt-dlp into `bin/`; opt-in, so `npm ci` never depends on GitHub being reachable. */

const RELEASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

/** The build published for this machine, checked against the release page; 32-bit ARM has none. */
export function assetFor(platform: NodeJS.Platform, arch: string): string | null {
	if (platform === "darwin") return "yt-dlp_macos";
	if (platform === "win32") return arch === "arm64" ? "yt-dlp_arm64.exe" : "yt-dlp.exe";
	if (platform === "linux" && arch === "x64") return "yt-dlp_linux";
	if (platform === "linux" && arch === "arm64") return "yt-dlp_linux_aarch64";
	return null;
}

const paint = painter();

function say(line = ""): void {
	process.stdout.write(`${line}\n`);
}

async function main(): Promise<void> {
	const asset = assetFor(process.platform, process.arch);
	if (asset === null) {
		const lines = [
			`yt-dlp publishes no ready-made build for ${process.platform} ${process.arch}.`,
			"",
			`${paint.cyan("➜")} ${paint.bold("python3 -m pip install -U yt-dlp")} installs it onto your PATH,`,
			"  which the bot finds on its own. Or set MUSIC_YTDLP_PATH to where it lives.",
		];
		process.stderr.write(`\n${box("No build for this machine", lines, "warning", paint).join("\n")}\n\n`);
		process.exitCode = 1;
		return;
	}

	const directory = resolve(process.cwd(), "bin");
	const target = join(directory, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

	mkdirSync(directory, { recursive: true });
	say();
	say(stepLine("working", "yt-dlp", `downloading ${asset}…`, undefined, paint));

	const started = performance.now();
	const response = await fetch(`${RELEASE}/${asset}`, { redirect: "follow" });
	if (!response.ok) throw new Error(`GitHub answered ${String(response.status)}`);

	writeFileSync(target, Buffer.from(await response.arrayBuffer()));
	if (process.platform !== "win32") chmodSync(target, 0o755);

	const fetched = findBinaries({ MUSIC_YTDLP_PATH: target });
	say(
		fetched.ytDlp === null
			? stepLine("failed", "yt-dlp", `saved to ${target}, but it would not run`, undefined, paint)
			: stepLine(
					"done",
					"yt-dlp",
					`${String(fetched.ytDlpVersion)} saved to ${target}`,
					performance.now() - started,
					paint,
				),
	);

	// The bot runs the newest copy it can find, so say which one that is now rather than assume it is this one.
	const found = findBinaries({});
	if (found.ytDlp !== null && found.ytDlp !== target) {
		say(
			stepLine(
				"warning",
				"In use",
				`the bot will run ${found.ytDlp} (${String(found.ytDlpVersion)}) instead`,
				undefined,
				paint,
			),
		);
	}

	say(
		found.ffmpeg === null
			? stepLine("skipped", "FFmpeg", "not found — optional, see below", undefined, paint)
			: stepLine("done", "FFmpeg", found.ffmpeg, undefined, paint),
	);
	say();

	if (found.ffmpeg === null) {
		const lines = [
			"Most tracks still play without it. It is what lets the volume change,",
			"and what plays the few tracks not already in Opus.",
			"",
			`  macOS     ${paint.bold("brew install ffmpeg")}`,
			`  Windows   ${paint.bold("winget install ffmpeg")}`,
			`  Linux     ${paint.bold("sudo apt install ffmpeg")} ${paint.dim("(or your distribution's own)")}`,
			"",
			"Or set MUSIC_FFMPEG_PATH to one you already have.",
		];
		say(box("FFmpeg is optional", lines, "info", paint).join("\n"));
		say();
	}

	say(`  ${paint.cyan("➜")} Restart the bot to pick this up. ${paint.bold("/music status")} shows what it found.`);
	say();

	if (!existsSync(target)) process.exitCode = 1;
}

if (require.main === module) {
	main().catch((error: unknown) => {
		const lines = [(error as Error).message, "", "Check this machine can reach github.com, then run it again."];
		process.stderr.write(`\n${box("Could not set music up", lines, "error", paint).join("\n")}\n\n`);
		process.exitCode = 1;
	});
}
