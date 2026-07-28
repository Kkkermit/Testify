import { spawnSync } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";

/**
 * Picks the FFmpeg the music player streams through.
 *
 * `ffmpeg-static` ships a **statically linked glibc** binary, and a static glibc
 * calling `getaddrinfo` has to `dlopen` NSS modules built against its own glibc
 * version. When the host's glibc differs it segfaults — exit 139, no stderr, no
 * output. Every network URL dies the same way while local input keeps working,
 * so the bot resolves a track, streams nothing, and the queue ends with no error.
 * That hits every source equally: YouTube, SoundCloud, all of them.
 *
 * A distro FFmpeg is dynamically linked and does not have the fault, so it is
 * preferred when there is one. `npm run music:doctor` reports which was chosen.
 */

/** Proves the binary both runs and can resolve a hostname without crashing. */
export function canStreamNetwork(path: string): boolean {
	// A host that cannot exist: this never leaves the machine, so it is fast and
	// works offline. A healthy FFmpeg exits non-zero with a DNS error message; the
	// broken one dies on SIGSEGV before printing anything.
	const probe = spawnSync(path, ["-hide_banner", "-i", "http://ffmpeg.invalid/probe", "-f", "null", "-"], {
		encoding: "utf8",
		timeout: 10_000,
	});

	return probe.signal !== "SIGSEGV" && probe.status !== 139;
}

export interface FfmpegChoice {
	path: string | null;
	source: "override" | "system" | "bundled" | "none";
	/** Set when the chosen binary is known to crash on network input. */
	degraded?: boolean;
}

/**
 * `override` wins outright — someone who set it has already made the decision.
 * Otherwise a working system FFmpeg beats the bundled one, and the bundled one is
 * still used as a last resort rather than leaving music dead entirely.
 */
export function resolveFfmpeg(override?: string): FfmpegChoice {
	if (override !== undefined && override !== "") return { path: override, source: "override" };

	const system = spawnSync("ffmpeg", ["-version"], { encoding: "utf8", timeout: 10_000 });
	if (system.status === 0 && canStreamNetwork("ffmpeg")) return { path: "ffmpeg", source: "system" };

	if (ffmpegStatic === null) return { path: null, source: "none" };

	return canStreamNetwork(ffmpegStatic)
		? { path: ffmpegStatic, source: "bundled" }
		: { path: ffmpegStatic, source: "bundled", degraded: true };
}
