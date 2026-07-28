import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SoundCloudPlugin } from "@distube/soundcloud";
import { YtDlpPlugin } from "@distube/yt-dlp";
import { DisTubeError, type Song } from "distube";

const execFileAsync = promisify(execFile);

/**
 * SoundCloud, without the DRM.
 *
 * SoundCloud offers each track in several "transcodings". The plugin asks for
 * none in particular and takes the first, which is now an **encrypted** HLS
 * stream — the URL contains `/cbcs/`, the Common Encryption scheme used by
 * FairPlay and Widevine. FFmpeg downloads those segments happily and then decodes
 * ciphertext as if it were AAC, which is why the log fills with "Reserved bit
 * set", "Number of bands exceeds limit" and "channel element is not allocated"
 * while the output stays at 0 kB. Nothing plays, and the queue ends.
 *
 * The fix is not to decrypt anything — that would be both illegal and pointless.
 * SoundCloud still publishes an unencrypted `progressive` transcoding of the same
 * track, so this asks for that one by name.
 *
 * A progressive stream is a single plain HTTP file rather than a playlist of
 * segments, which is also the only shape the loopback relay can carry.
 */

/** Marks a transcoding as Common Encryption protected. */
const ENCRYPTED = /\/cbcs\/|\/cenc\//;

interface Transcoding {
	url?: string;
	format?: { protocol?: string };
}

interface SoundCloudInternals {
	util: {
		sortTranscodings(track: string, protocol?: string): Promise<Transcoding[]>;
		getStreamLink(transcoding: Transcoding): Promise<string | null>;
	};
}

/**
 * Unencrypted transcodings, best first.
 *
 * Exported because the ordering is the entire decision and is worth testing on
 * its own, without a SoundCloud client.
 */
export function playableTranscodings(all: Transcoding[]): Transcoding[] {
	const usable = all.filter((option) => !ENCRYPTED.test(option.url ?? "") && (option.url ?? "") !== "");

	return [
		...usable.filter((option) => option.format?.protocol === "progressive"),
		...usable.filter((option) => option.format?.protocol !== "progressive"),
	];
}

export class ProgressiveSoundCloudPlugin extends SoundCloudPlugin {
	/** Set by the player so the choice shows up in the log when a track fails. */
	debugLog: (message: string) => void = () => undefined;

	override async getStreamURL(song: { url?: string }): Promise<string> {
		if (song.url === undefined || song.url === "") {
			throw new DisTubeError("SOUNDCLOUD_PLUGIN_INVALID_SONG", "Cannot get stream url from invalid song.");
		}

		const { util } = this.soundcloud as unknown as SoundCloudInternals;
		const all = await util.sortTranscodings(song.url);
		const candidates = playableTranscodings(all);

		this.debugLog(
			`[SOUNDCLOUD] ${all.length} transcoding(s), ${candidates.length} unencrypted: ` +
				all
					.map((option) => `${option.format?.protocol ?? "?"}${ENCRYPTED.test(option.url ?? "") ? " (drm)" : ""}`)
					.join(", "),
		);

		if (candidates.length === 0) {
			throw new DisTubeError(
				"SOUNDCLOUD_DRM",
				"SoundCloud only offers this track as a DRM-protected stream, which cannot be played.",
			);
		}

		// Each candidate is a separate API call that can come back without a URL —
		// a rate limit, a region block, a Go+ track. Trying the next one is far more
		// robust than betting on the first, which is how this returned undefined and
		// surfaced as DisTube's opaque CANNOT_GET_STREAM_URL.
		for (const candidate of candidates) {
			const link = await util.getStreamLink(candidate).catch(() => null);

			// `getStreamLink` reads `.url` off a JSON body, so it yields undefined —
			// not null — whenever SoundCloud answers with anything unexpected.
			if (typeof link === "string" && link !== "") return link;

			this.debugLog(`[SOUNDCLOUD] No stream URL from the ${candidate.format?.protocol ?? "unknown"} transcoding.`);
		}

		throw new DisTubeError(
			"SOUNDCLOUD_PLUGIN_RATE_LIMITED",
			"SoundCloud returned no playable stream for this track. It may be rate limited, region locked or Go+ only.",
		);
	}
}

/**
 * yt-dlp is asked for `ba/ba*`, which can resolve to a segmented HLS or DASH
 * rendition for the same reason. Naming the plain-HTTPS variants first keeps
 * playback on one progressive URL — which decodes reliably and is the only shape
 * the relay can carry. The bare `ba/ba*` tail means the worst case is exactly the
 * old behaviour rather than a track that will not resolve at all.
 */
export const YTDLP_AUDIO_FORMAT = "ba[protocol=https]/ba*[protocol=https]/ba/ba*";

/** Where the plugin keeps the binary it downloads. */
function ytDlpBinary(): string {
	return require.resolve("@distube/yt-dlp/bin/yt-dlp");
}

export class ProgressiveYtDlpPlugin extends YtDlpPlugin {
	override async getStreamURL<T>(song: Song<T>): Promise<string> {
		if (song.url === undefined || song.url === "") {
			throw new DisTubeError("YTDLP_PLUGIN_INVALID_SONG", "Cannot get stream url from invalid song.");
		}

		// Deliberately no `--no-call-home`: the upstream plugin still passes it and
		// current yt-dlp prints a deprecation warning for it on every single call.
		const { stdout } = await execFileAsync(
			ytDlpBinary(),
			[
				"--dump-single-json",
				"--no-warnings",
				"--prefer-free-formats",
				"--skip-download",
				"--simulate",
				"--format",
				YTDLP_AUDIO_FORMAT,
				song.url,
			],
			{ maxBuffer: 1 << 26 },
		).catch((error: unknown) => {
			const detail = error as { stderr?: string };
			throw new DisTubeError("YTDLP_ERROR", String(detail.stderr ?? error));
		});

		const info = JSON.parse(stdout) as { url?: string };
		if (info.url === undefined) throw new DisTubeError("YTDLP_ERROR", "yt-dlp returned no playable stream URL.");

		return info.url;
	}
}
