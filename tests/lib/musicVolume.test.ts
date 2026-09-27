import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ffmpegArgs } from "@lib/music/musicSource.util";

/** What `-af volume=` does to real audio; skipped where `ffmpeg-static` could not install. */
const ffmpeg = resolveFfmpeg();
const describeWithFfmpeg = ffmpeg === null ? describe.skip : describe;

function resolveFfmpeg(): string | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const path: unknown = require("ffmpeg-static");

		return typeof path === "string" && existsSync(path) ? path : null;
	} catch {
		return null;
	}
}

function run(args: string[], input?: Buffer): Buffer {
	const attempt = spawnSync(ffmpeg ?? "", args, { input, maxBuffer: 1 << 28 });
	if (attempt.status !== 0) throw new Error(`ffmpeg exited ${String(attempt.status)}: ${String(attempt.stderr)}`);

	return attempt.stdout;
}

/** A ten-second tone, encoded the way YouTube serves audio: Opus inside WebM. */
function tone(): Buffer {
	return run([
		"-hide_banner",
		"-loglevel",
		"error",
		"-f",
		"lavfi",
		"-i",
		"sine=frequency=440:duration=10",
		"-c:a",
		"libopus",
		"-b:a",
		"96k",
		"-f",
		"webm",
		"pipe:1",
	]);
}

/** Decodes the bot's own output back to PCM, so the measurement is of what Discord would have received. */
function loudnessOf(encoded: Buffer): number {
	const pcm = run(["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "pipe:1"], encoded);

	let sum = 0;
	for (let at = 0; at + 1 < pcm.length; at += 2) {
		const sample = pcm.readInt16LE(at);
		sum += sample * sample;
	}

	return Math.sqrt(sum / (pcm.length / 2));
}

describeWithFfmpeg("the volume filter, against a real FFmpeg", () => {
	let source: Buffer;

	beforeAll(() => {
		source = tone();
	});

	/** `StreamType.OggOpus` is what the session hands the resource, and anything else plays as silence. */
	it("writes Ogg-framed Opus whatever the level", () => {
		for (const volume of [100, 50]) {
			const out = run(ffmpegArgs({ volume }), source);

			expect(out.subarray(0, 4).toString("latin1")).toBe("OggS");
			expect(out.subarray(0, 64).toString("latin1")).toContain("OpusHead");
		}
	});

	it("scales the audio by exactly what was asked for", () => {
		const base = loudnessOf(run(ffmpegArgs({ volume: 100 }), source));

		expect(loudnessOf(run(ffmpegArgs({ volume: 50 }), source)) / base).toBeCloseTo(0.5, 2);
		expect(loudnessOf(run(ffmpegArgs({ volume: 150 }), source)) / base).toBeCloseTo(1.5, 2);
	});

	/** A re-opened track starts where it was told to. */
	it("really starts where it was told to, rather than from the beginning", () => {
		const whole = run(ffmpegArgs({}), source).length;
		const skipped = run(ffmpegArgs({ seekMs: 6_000 }), source).length;

		expect(skipped).toBeLessThan(whole * 0.6);
	});
});
