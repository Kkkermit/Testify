import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { download } from "@distube/yt-dlp";

/**
 * Refreshes the yt-dlp binary the music player extracts with.
 *
 * YouTube changes break yt-dlp regularly, and the symptom is unhelpful: the bot
 * finds the track, fails to stream it, and the queue ends immediately. Running
 * this fixes it without waiting for a new release of the plugin.
 */
const run = promisify(execFile);

async function main(): Promise<void> {
	process.stdout.write("Downloading the latest yt-dlp…\n");

	const version = await download();
	process.stdout.write(`Downloaded yt-dlp ${version}.\n`);

	// Proves the binary actually runs here, rather than only that it downloaded.
	const { stdout } = await run(require.resolve("@distube/yt-dlp/bin/yt-dlp"), ["--version"]).catch(() => ({
		stdout: "",
	}));

	if (stdout.trim()) process.stdout.write(`Verified: yt-dlp reports ${stdout.trim()}.\n`);
	else process.stderr.write("Downloaded, but the binary would not run. Check file permissions.\n");
}

main().catch((error: unknown) => {
	process.stderr.write(`\nCould not update yt-dlp:\n\n${(error as Error).message}\n\n`);
	process.exitCode = 1;
});
