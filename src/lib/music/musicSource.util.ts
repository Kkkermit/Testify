import { spawn } from "node:child_process";
import { PassThrough, type Readable } from "node:stream";
import { toError, UserFacingError } from "@core/errors";
import { observe } from "@lib/infra/serviceHealth.util";
import { MUSIC_SOURCE_NAMES, SEARCH_RESULTS, UNITY_VOLUME } from "@lib/music/music.constants";
import {
	type DownloadProblem,
	type OpenStream,
	type MusicBinaries,
	type MusicSource,
	type RemoteFormat,
	type StreamPlan,
	type Query,
	type Track,
} from "@lib/music/music.types";
import { clampVolume } from "@lib/music/musicFormat.util";
import { aboutTheTrack, classifyProblem } from "@lib/music/musicProblem.util";
import { sourceOfHost } from "@lib/music/musicQuery.util";

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
 * One yt-dlp entry as a track, or null; a live stream has no duration, which stops an ended broadcast looking broken.
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

/** Signs yt-dlp in to YouTube when the host gave it cookies. */
export function cookieArgs(binaries: Pick<MusicBinaries, "cookies">): string[] {
	return binaries.cookies === undefined || binaries.cookies === null ? [] : ["--cookies", binaries.cookies];
}

/** A download refused for a reason the player knows, which the reader is told rather than handed a stack. */
export class MusicProblemError extends UserFacingError {
	constructor(
		readonly problem: DownloadProblem,
		hint?: string,
	) {
		super(hint === undefined ? problem.advice : `${problem.advice} ${hint}`);
	}
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

/** A video that is private, removed or DRM-protected is an answer from the source, not a sign that it is down. */
function blamesSource(error: unknown): boolean {
	return !aboutTheTrack(classifyProblem(toError(error).message));
}

function askSource(source: MusicSource, binary: string, args: string[]): Promise<string> {
	// Only the two services the status page tracks are recorded; any other site is just a site.
	if (source !== "youtube" && source !== "soundcloud") return runYtDlp(binary, args);

	return observe(MUSIC_SOURCE_NAMES[source], () => runYtDlp(binary, args), { blame: blamesSource });
}

function sourceOfUrl(url: string): MusicSource {
	try {
		return sourceOfHost(new URL(url).hostname);
	} catch {
		return "other";
	}
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

/** How many SoundCloud results a search reads to find one that plays, since a DRM-protected one first must not end it. */
export const SOUNDCLOUD_SEARCH_DEPTH = 5;

const NOTHING_PLAYABLE: DownloadProblem = {
	kind: "drm",
	advice: "Everything SoundCloud found for that is DRM-protected, so no bot can play it. Try a different search.",
};

/** A result with no formats is one the service would not hand over: DRM-protected, or blocked where the bot runs. */
export function isPlayable(info: TrackInfo): boolean {
	return Array.isArray(info.formats) && info.formats.length > 0;
}

/** Only a full SoundCloud search skips what cannot play; a flat search reads no formats to judge by. */
function skipsLocked(query: Query, flat: boolean): boolean {
	return query.kind === "search" && query.source === "soundcloud" && !flat;
}

export async function resolveTracks(
	query: Query,
	requestedBy: string,
	binaries: MusicBinaries,
	options: { flat?: boolean; results?: number } = {},
): Promise<Track[]> {
	if (binaries.ytDlp === null) {
		throw new UserFacingError("Music needs `yt-dlp`, which is not installed. Run `npm run music:setup` on the host.");
	}

	const flat = options.flat === true;
	const skipping = skipsLocked(query, flat);
	// With this flag yt-dlp returns a protected result without formats rather than failing the whole search.
	const results = skipping ? Math.max(options.results ?? SEARCH_RESULTS, SOUNDCLOUD_SEARCH_DEPTH) : options.results;

	const args = [
		"--dump-json",
		"--no-warnings",
		"--no-progress",
		"--ignore-config",
		...(flat ? ["--flat-playlist"] : ["--no-playlist"]),
		...(skipping ? ["--ignore-no-formats-error"] : []),
		...cookieArgs(binaries),
		...argumentsFor(query, results),
	];

	let stdout: string;
	try {
		stdout = await askSource(query.source, binaries.ytDlp, args);
	} catch (error) {
		const problem = classifyProblem(toError(error).message);
		if (problem !== null) throw new MusicProblemError(problem);
		throw error;
	}
	const documents = parseJsonLines(stdout);
	const usable = skipping ? documents.filter(isPlayable) : documents;
	if (usable.length === 0 && documents.length > 0) throw new MusicProblemError(NOTHING_PLAYABLE);

	return usable.flatMap((info) => tracksFromInfo(info, requestedBy, query.source));
}

/** Format ids are stable for a video, so ten minutes of reuse is safe and saves an extraction per re-open. */
const DESCRIBED_TTL_MS = 600_000;
const DESCRIBED_MAX = 100;

/** Descriptions already fetched, keyed by binary and address, so a re-open does not ask YouTube twice. */
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

	const stdout = await askSource(sourceOfUrl(url), binaries.ytDlp, [
		"--dump-single-json",
		"--no-warnings",
		"--no-progress",
		"--ignore-config",
		"--no-playlist",
		...cookieArgs(binaries),
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
 * How far ahead of the player the download may get; without room, yt-dlp blocks on a full pipe and its connection is
 * dropped.
 */
const BUFFER_BYTES = 1 << 24;

/** The last of stderr, which is all that is worth keeping and all that can be logged safely. */
const PROBLEM_TAIL = 500;

/** `--no-playlist`, or a link copied out of a playlist streams the whole list down one pipe. */
export function ytDlpStreamArgs(formatId: string, url: string, cookies: string | null = null): string[] {
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
		...cookieArgs({ cookies }),
		url,
	];
}

/**
 * Reads `source` into a buffer the player drains at its own pace; `pipe` does not carry errors, so they are forwarded
 * by hand.
 */
function buffer(source: Readable): PassThrough {
	const sink = new PassThrough({ highWaterMark: BUFFER_BYTES });

	source.on("error", (error: Error) => sink.destroy(error));
	source.pipe(sink);

	return sink;
}

/** YouTube's best Opus is about this, so a re-encode loses as little as it can without inflating the stream. */
export const TRANSCODE_BITRATE = "160k";

/** `-ss` before `-i` discards packets rather than decoding them, and the output is 48 kHz Opus. */
export function ffmpegArgs(options: StreamOptions = {}): string[] {
	const seekMs = Math.max(0, Math.round(options.seekMs ?? 0));
	const volume = clampVolume(options.volume ?? UNITY_VOLUME);

	return [
		"-hide_banner",
		"-loglevel",
		"error",
		...(seekMs > 0 ? ["-ss", (seekMs / 1_000).toFixed(3)] : []),
		"-i",
		"pipe:0",
		"-vn",
		...(volume === UNITY_VOLUME ? [] : ["-af", `volume=${(volume / 100).toFixed(3)}`]),
		"-c:a",
		"libopus",
		"-b:a",
		TRANSCODE_BITRATE,
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
 * Opens a playable stream; yt-dlp does every HTTP request, because the static FFmpeg build segfaults on any hostname.
 */
export function openStream(
	url: string,
	plan: StreamPlan,
	binaries: MusicBinaries,
	options: StreamOptions = {},
): OpenStream {
	if (binaries.ytDlp === null) throw new UserFacingError("Music needs `yt-dlp`, which is not installed.");

	const source = spawn(binaries.ytDlp, ytDlpStreamArgs(plan.formatId, url, binaries.cookies ?? null), {
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
			// Kill the whole tree, since a surviving child keeps the pipe open.
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
