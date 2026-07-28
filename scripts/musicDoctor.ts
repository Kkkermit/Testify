import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { type FfmpegChoice, resolveFfmpeg } from "@lib/ffmpeg.util";

/**
 * Checks the music pipeline on the machine the bot actually runs on.
 *
 * A playback failure looks identical whatever caused it — the track resolves, no
 * audio arrives, the queue ends. This walks the chain in order and names the first
 * broken link, including the network fetch, which is the part that cannot be
 * checked from anywhere but the host itself.
 */

const run = promisify(execFile);

type Status = "ok" | "warn" | "fail";
interface Check {
	name: string;
	status: Status;
	detail: string;
}

const GLYPH: Record<Status, string> = { ok: "✓", warn: "⚠", fail: "✗" };

async function checkFfmpeg(chosen: FfmpegChoice): Promise<Check[]> {
	if (chosen.path === null) {
		return [{ name: "FFmpeg", status: "fail", detail: "No FFmpeg found at all. Reinstall with `npm ci`." }];
	}

	const version = await run(chosen.path, ["-version"]).catch(() => ({ stdout: "" }));
	if (!version.stdout) {
		return [{ name: "FFmpeg", status: "fail", detail: `Would not run at ${chosen.path}. Check file permissions.` }];
	}

	const protocols = await run(chosen.path, ["-hide_banner", "-protocols"]).catch(() => ({ stdout: "" }));
	const https = /^\s*https\s*$/m.test(protocols.stdout);

	return [
		{ name: "FFmpeg", status: "ok", detail: `${version.stdout.split("\n")[0] ?? ""} (${chosen.source})` },
		{
			name: "FFmpeg HTTPS",
			status: https ? "ok" : "fail",
			detail: https
				? "https and tls protocols available"
				: "This build has no https support, so no URL can be fetched.",
		},
		{
			name: "FFmpeg network",
			status: chosen.degraded === true ? "fail" : "ok",
			detail:
				chosen.degraded === true
					? "Segfaults on ANY network URL — this alone stops every track, on every source, with no error message. " +
						"It is the statically-linked glibc in ffmpeg-static failing to resolve hostnames. " +
						"Fix: install FFmpeg system-wide (apt install ffmpeg / brew install ffmpeg), or set FFMPEG_PATH."
					: "survives a hostname lookup without crashing",
		},
	];
}

async function checkOpus(): Promise<Check> {
	for (const candidate of ["@discordjs/opus", "opusscript"]) {
		try {
			await import(candidate);
			const native = candidate === "@discordjs/opus";
			return {
				name: "Opus encoder",
				status: "ok",
				detail: native ? `${candidate} (native)` : `${candidate} (pure JS — works, but uses more CPU)`,
			};
		} catch {
			continue;
		}
	}

	return { name: "Opus encoder", status: "fail", detail: "None installed. Install opusscript or @discordjs/opus." };
}

async function checkEncryption(): Promise<Check> {
	const { getCiphers } = await import("node:crypto");
	if (getCiphers().includes("aes-256-gcm")) {
		return { name: "Voice encryption", status: "ok", detail: "node:crypto provides aes-256-gcm" };
	}

	for (const candidate of ["sodium-native", "libsodium-wrappers", "@noble/ciphers", "@stablelib/xchacha20poly1305"]) {
		try {
			await import(candidate);
			return { name: "Voice encryption", status: "ok", detail: candidate };
		} catch {
			continue;
		}
	}

	return {
		name: "Voice encryption",
		status: "fail",
		detail: "No supported encryption package. Playback cannot start.",
	};
}

async function checkYtDlp(): Promise<Check> {
	const binary = await import("@distube/yt-dlp")
		.then(() => require.resolve("@distube/yt-dlp/bin/yt-dlp"))
		.catch(() => null);

	if (binary === null) {
		return { name: "yt-dlp", status: "fail", detail: "Plugin or binary missing. Run `npm run music:update`." };
	}

	const { stdout } = await run(binary, ["--version"]).catch(() => ({ stdout: "" }));
	return stdout.trim()
		? { name: "yt-dlp", status: "ok", detail: stdout.trim() }
		: { name: "yt-dlp", status: "fail", detail: "Binary will not run. Run `npm run music:update`." };
}

/** The part no other machine can answer: can this host actually pull audio down? */
async function checkFetch(label: string, url: string, ffmpegPath: string | null): Promise<Check> {
	if (ffmpegPath === null) return { name: label, status: "fail", detail: "No FFmpeg to fetch with." };

	return new Promise((resolve) => {
		// Decodes one second and throws it away. Enough to prove the fetch and the
		// decode both work without downloading the whole track.
		const probe = spawn(
			ffmpegPath,
			["-hide_banner", "-t", "1", "-i", url, "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
			{ stdio: ["ignore", "pipe", "pipe"] },
		);

		let bytes = 0;
		let stderr = "";
		const timer = setTimeout(() => probe.kill("SIGKILL"), 25_000);

		probe.stdout.on("data", (chunk: Buffer) => (bytes += chunk.length));
		probe.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
		probe.on("error", (error) => {
			clearTimeout(timer);
			resolve({ name: label, status: "fail", detail: error.message });
		});
		probe.on("close", (code, signal) => {
			clearTimeout(timer);

			if (bytes > 0) {
				resolve({ name: label, status: "ok", detail: `decoded ${bytes.toLocaleString()} bytes of audio` });
				return;
			}

			if (signal === "SIGSEGV" || code === 139) {
				resolve({ name: label, status: "fail", detail: "FFmpeg segfaulted — see the FFmpeg network check above." });
				return;
			}

			const reason = stderr
				.split(/\r?\n/)
				.filter((line) => /error|forbidden|refused|failed|denied|4\d{2}|5\d{2}/i.test(line))
				.slice(-2)
				.join(" | ");

			resolve({ name: label, status: "fail", detail: reason || "No audio produced and FFmpeg said nothing useful." });
		});
	});
}

async function main(): Promise<void> {
	process.stdout.write("\nChecking the music pipeline…\n\n");

	const chosen = resolveFfmpeg(process.env.FFMPEG_PATH);

	const checks: Check[] = [
		...(await checkFfmpeg(chosen)),
		await checkOpus(),
		await checkEncryption(),
		await checkYtDlp(),
		// A small public file over plain HTTPS. Proves the host can fetch and decode
		// at all, which separates a network problem from an extractor problem.
		await checkFetch("Network fetch", "https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg", chosen.path),
	];

	const width = Math.max(...checks.map((check) => check.name.length));
	for (const check of checks) {
		process.stdout.write(`  ${GLYPH[check.status]} ${check.name.padEnd(width)}  ${check.detail}\n`);
	}

	const failed = checks.filter((check) => check.status === "fail");
	process.stdout.write(
		failed.length === 0
			? "\nEverything the bot needs locally is working.\nIf playback still fails, run the bot with LOG_LEVEL=debug and play a track — FFmpeg's\noutput will be logged, and the last few lines before the queue ends name the cause.\n\n"
			: `\n${failed.length} check(s) failed. Fix the first one listed and run this again.\n\n`,
	);

	if (failed.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
	process.stderr.write(`\nThe check itself failed:\n\n${(error as Error).message}\n\n`);
	process.exitCode = 1;
});
