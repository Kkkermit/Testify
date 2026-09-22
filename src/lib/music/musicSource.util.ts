import { spawn } from "node:child_process";
import { PassThrough, type Readable } from "node:stream";
import { UserFacingError } from "@core/errors";
import { SEARCH_RESULTS, DEFAULT_VOLUME } from "@lib/music/music.constants";
import {
	type OpenStream,
	type MusicBinaries,
	type RemoteFormat,
	type StreamPlan,
	type Query,
	type Track,
} from "@lib/music/music.types";
import { clampVolume, planStream } from "@lib/music/musicFormat.util";

/** Everything that shells out to yt-dlp, with the parsing kept pure beside it. */

const RESOLVE_TIMEOUT_MS = 30_000;

export const PLAYLIST_LIMIT = 100;

/** The subset of yt-dlp's JSON this needs; it emits far more, and none of the rest is depended on. */
export interface TrackInfo {
	id?: string | null;
	title?: string | null;
	uploader?: string | null;
	channel?: string | null;
	duration?: number | null;
	thumbnail?: string | null;
	webpage_url?: string | null;
	url?: string | null;
	original_url?: string | null;
	is_live?: boolean | null;
	formats?: RemoteFormat[] | null;
	entries?: TrackInfo[] | null;
	extractor_key?: string | null;
}

function addressOf(info: TrackInfo): string | null {
	return info.webpage_url ?? info.original_url ?? info.url ?? null;
}

/**
 * One entry of yt-dlp's answer as a queue track, or `null` when it carries nothing playable.
 *
 * A live stream reports no duration, which is meaningful rather than missing: it is what stops the player
 * treating an ended broadcast as a track that broke.
 */
export function trackFromInfo(info: TrackInfo, requestedBy: string, source: Track["source"]): Track | null {
	const url = addressOf(info);
	if (url === null || url === "") return null;

	const title = info.title ?? "Unknown track";
	const durationSeconds = info.is_live === true ? null : (info.duration ?? null);

	return {
		url,
		title,
		author: info.uploader ?? info.channel ?? null,
		durationMs: durationSeconds === null || durationSeconds <= 0 ? null : Math.round(durationSeconds * 1_000),
		thumbnail: info.thumbnail ?? null,
		source,
		requestedBy,
	};
}

/** Flattens the single-track and playlist shapes into one list, capped so a huge playlist cannot flood a guild. */
export function tracksFromInfo(
	info: TrackInfo,
	requestedBy: string,
	source: Track["source"],
	limit = PLAYLIST_LIMIT,
): Track[] {
	const entries = info.entries ?? null;
	const list = entries === null ? [info] : entries.slice(0, limit);

	return list
		.map((entry) => trackFromInfo(entry, requestedBy, source))
		.filter((track): track is Track => track !== null);
}

/** What yt-dlp is asked for, given what the person typed. */
export function argumentsFor(query: Query, results = SEARCH_RESULTS): string[] {
	if (query.kind === "url") return [query.url];

	const prefix = query.source === "soundcloud" ? "scsearch" : "ytsearch";

	return [`${prefix}${String(results)}:${query.terms}`];
}

async function runYtDlp(binary: string, args: string[], timeoutMs = RESOLVE_TIMEOUT_MS): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			reject(new Error(`yt-dlp timed out after ${String(timeoutMs)}ms`));
		}, timeoutMs);

		let out = "";
		let err = "";
		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => (out += chunk));
		child.stderr.setEncoding("utf8");
		child.stderr.on("data", (chunk: string) => (err += chunk));

		child.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.once("close", (code) => {
			clearTimeout(timer);
			if (code === 0) resolve(out);
			else reject(new Error(err.trim() === "" ? `yt-dlp exited ${String(code)}` : err.trim()));
		});
	});
}

/** yt-dlp prints one JSON document per result, so a search comes back as several lines rather than an array. */
export function parseJsonLines(stdout: string): TrackInfo[] {
	return stdout
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("{"))
		.flatMap((line) => {
			try {
				return [JSON.parse(line) as TrackInfo];
			} catch {
				return [];
			}
		});
}

export async function resolveTracks(
	query: Query,
	requestedBy: string,
	binaries: MusicBinaries,
	options: { flat?: boolean } = {},
): Promise<Track[]> {
	if (binaries.ytDlp === null) {
		throw new UserFacingError("Music needs `yt-dlp`, which is not installed. Run `npm run music:setup` on the host.");
	}

	const args = [
		"--dump-json",
		"--no-warnings",
		"--no-progress",
		"--ignore-config",
		...(options.flat === true ? ["--flat-playlist"] : ["--no-playlist"]),
		...argumentsFor(query),
	];

	const stdout = await runYtDlp(binaries.ytDlp, args);
	const documents = parseJsonLines(stdout);

	return documents.flatMap((info) => tracksFromInfo(info, requestedBy, query.source));
}

/** Format ids are stable for a video, so ten minutes of reuse is safe and saves an extraction per re-open. */
const DESCRIBED_TTL_MS = 600_000;
const DESCRIBED_MAX = 100;

/**
 * Descriptions already fetched, keyed by binary and address.
 *
 * A volume change, a Previous and every retry re-open the track, and each of those used to cost two requests to
 * YouTube rather than one — which matters, because request volume is part of what gets a host flagged.
 */
const described = new Map<string, { info: TrackInfo; at: number }>();

function describedKey(url: string, binary: string): string {
	return `${binary}\n${url}`;
}

/** Drops a cached description, so a track the downloader refused is looked at afresh on its next go. */
export function forgetDescription(url: string, binaries: MusicBinaries): void {
	if (binaries.ytDlp !== null) described.delete(describedKey(url, binaries.ytDlp));
}

/** The full record for one track, which is what carries the format list the plan is chosen from. */
export async function describeTrack(url: string, binaries: MusicBinaries, now = Date.now()): Promise<TrackInfo | null> {
	if (binaries.ytDlp === null) return null;

	const key = describedKey(url, binaries.ytDlp);
	const cached = described.get(key);
	if (cached !== undefined && now - cached.at < DESCRIBED_TTL_MS) return cached.info;

	const stdout = await runYtDlp(binaries.ytDlp, [
		"--dump-single-json",
		"--no-warnings",
		"--no-progress",
		"--ignore-config",
		"--no-playlist",
		url,
	]);

	const info = parseJsonLines(stdout).at(0) ?? null;
	if (info === null) return null;

	described.delete(key);
	described.set(key, { info, at: now });
	if (described.size > DESCRIBED_MAX) {
		const oldest = described.keys().next();
		if (oldest.done !== true) described.delete(oldest.value);
	}

	return info;
}

export interface StreamOptions {
	/** A percentage of the track's own level; only the transcoding path can change it. */
	volume?: number;
	/** Where in the track to start, which is how a setting changed mid-track picks up where it was. */
	seekMs?: number;
	/** Told what a dying downloader said, which is the only place the reason is written down. */
	onProblem?: (message: string) => void;
}

/**
 * How far ahead of the player the download is allowed to get.
 *
 * Discord consumes at real time, so without somewhere to put the rest yt-dlp spends the whole track blocked on
 * a full 64 KB pipe — and a downloader that has stopped reading its own socket gets the connection dropped
 * under it, which arrives here as `ERR_STREAM_PREMATURE_CLOSE` a few seconds in. Sixteen megabytes is over a
 * quarter of an hour of Opus, so an ordinary track is downloaded once and played out of memory.
 */
export const BUFFER_BYTES = 1 << 24;

/** The last of stderr, which is all that is worth keeping and all that can be logged safely. */
const PROBLEM_TAIL = 500;

/**
 * What yt-dlp is asked for when it is streaming rather than describing.
 *
 * `--no-playlist` matters: a YouTube link copied from a playlist carries `&list=`, and without it the
 * downloader would work through the whole list into one pipe.
 */
export function ytDlpStreamArgs(formatId: string, url: string): string[] {
	return [
		"--quiet",
		"--no-warnings",
		"--no-progress",
		"--ignore-config",
		"--no-playlist",
		"--retries",
		"10",
		"--fragment-retries",
		"10",
		"--socket-timeout",
		"30",
		"-f",
		formatId,
		"-o",
		"-",
		url,
	];
}

/**
 * Reads `source` as fast as it will go into a buffer the player drains at its own pace.
 *
 * `pipe` does not carry an error across, so a broken source has to be pushed through by hand or the reader
 * waits for an end that never comes.
 */
function buffer(source: Readable): PassThrough {
	const sink = new PassThrough({ highWaterMark: BUFFER_BYTES });

	source.on("error", (error: Error) => sink.destroy(error));
	source.pipe(sink);

	return sink;
}

/**
 * What FFmpeg is asked to do, kept pure because the arguments are the whole of what can be wrong here.
 *
 * `-ss` sits before `-i` so the packets are discarded rather than decoded, and the output is Opus at 48 kHz —
 * what Discord wants — so nothing downstream has to convert again.
 */
export function ffmpegArgs(options: StreamOptions = {}): string[] {
	const seekMs = Math.max(0, Math.round(options.seekMs ?? 0));
	const volume = clampVolume(options.volume ?? DEFAULT_VOLUME);

	return [
		"-hide_banner",
		"-loglevel",
		"error",
		...(seekMs > 0 ? ["-ss", (seekMs / 1_000).toFixed(3)] : []),
		"-i",
		"pipe:0",
		"-vn",
		...(volume === DEFAULT_VOLUME ? [] : ["-af", `volume=${(volume / 100).toFixed(3)}`]),
		"-c:a",
		"libopus",
		"-b:a",
		"128k",
		"-ar",
		"48000",
		"-ac",
		"2",
		"-f",
		"opus",
		"pipe:1",
	];
}

/**
 * Opens a playable byte stream.
 *
 * yt-dlp does every HTTP request, which is what keeps FFmpeg off the network entirely — its bundled static
 * build segfaults on any hostname, and reading a pipe cannot trigger that.
 */
export function openStream(
	url: string,
	plan: StreamPlan,
	binaries: MusicBinaries,
	options: StreamOptions = {},
): OpenStream {
	if (binaries.ytDlp === null) throw new UserFacingError("Music needs `yt-dlp`, which is not installed.");

	const source = spawn(binaries.ytDlp, ytDlpStreamArgs(plan.formatId, url), {
		stdio: ["ignore", "pipe", "pipe"],
		windowsHide: true,
	});

	let complaint = "";
	source.stderr.setEncoding("utf8");
	source.stderr.on("data", (chunk: string) => (complaint = `${complaint}${chunk}`.slice(-PROBLEM_TAIL)));
	source.once("close", (code) => {
		if (code !== 0 && code !== null)
			options.onProblem?.(complaint.trim() === "" ? `yt-dlp exited ${String(code)}` : complaint.trim());
	});

	if (plan.shape !== "transcode") {
		const stream = buffer(source.stdout);

		return {
			stream,
			plan,
			// Killing the process is not enough on its own: anything it spawned survives the signal and keeps the
			// pipe open, so the reader would wait for an end that never comes.
			close: () => {
				source.kill("SIGKILL");
				source.stdout.destroy();
				stream.destroy();
			},
		};
	}

	if (binaries.ffmpeg === null) throw new UserFacingError("That track needs FFmpeg to play, and it is not installed.");

	const transcoder = spawn(binaries.ffmpeg, ffmpegArgs(options), {
		stdio: ["pipe", "pipe", "ignore"],
		windowsHide: true,
	});

	source.stdout.pipe(transcoder.stdin);
	// A dead transcoder must not leave yt-dlp writing into a closed pipe for the rest of the process's life.
	source.stdout.on("error", () => transcoder.kill("SIGKILL"));
	transcoder.stdin.on("error", () => source.kill("SIGKILL"));

	// The buffer goes after FFmpeg: it reads eagerly, so it is what keeps yt-dlp off a full pipe.
	const stream = buffer(transcoder.stdout);

	return {
		stream,
		plan,
		close: () => {
			source.kill("SIGKILL");
			transcoder.kill("SIGKILL");
			source.stdout.destroy();
			transcoder.stdout.destroy();
			stream.destroy();
		},
	};
}

export { planStream };
