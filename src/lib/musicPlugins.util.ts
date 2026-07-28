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

export class ProgressiveSoundCloudPlugin extends SoundCloudPlugin {
	override async getStreamURL(song: { url?: string }): Promise<string> {
		if (song.url === undefined || song.url === "") {
			throw new DisTubeError("SOUNDCLOUD_PLUGIN_INVALID_SONG", "Cannot get stream url from invalid song.");
		}

		const { util } = this.soundcloud as unknown as SoundCloudInternals;
		const all = await util.sortTranscodings(song.url);

		// Progressive first, then anything that at least is not encrypted. Falling
		// back keeps older tracks playing where SoundCloud has not published a
		// progressive rendition.
		const playable =
			all.find((option) => option.format?.protocol === "progressive" && !ENCRYPTED.test(option.url ?? "")) ??
			all.find((option) => !ENCRYPTED.test(option.url ?? ""));

		if (playable === undefined) {
			throw new DisTubeError(
				"SOUNDCLOUD_DRM",
				"SoundCloud only offers this track as a DRM-protected stream, which cannot be played.",
			);
		}

		const link = await util.getStreamLink(playable);
		if (link === null || link === "") {
			throw new DisTubeError(
				"SOUNDCLOUD_PLUGIN_RATE_LIMITED",
				"SoundCloud refused the stream request. Try again shortly.",
			);
		}

		return link;
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
