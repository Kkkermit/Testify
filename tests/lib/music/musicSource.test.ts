import type * as ChildProcesses from "node:child_process";
import { type ChildProcess, type SpawnOptions, spawnSync } from "node:child_process";
import type * as Fs from "node:fs";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
	argumentsFor,
	describeTrack,
	ffmpegArgs,
	TRANSCODE_BITRATE,
	openStream,
	parseJsonLines,
	MusicProblemError,
	resolveTracks,
	SOUNDCLOUD_SEARCH_DEPTH,
	PLAYLIST_LIMIT,
	sweepScratchFolders,
	type TrackInfo,
	trackFromInfo,
	tracksFromInfo,
	ytDlpStreamArgs,
} from "@lib/music/musicSource.util";

// A fake binary is a script, which only Node can run on every system, so the spawn behind the real one runs it.
jest.mock("node:child_process", () => {
	const actual = jest.requireActual<typeof ChildProcesses>("node:child_process");
	const spawn = (command: string, args: string[], options: SpawnOptions): ChildProcess =>
		command.endsWith(".cjs")
			? actual.spawn(process.execPath, [command, ...args], options)
			: actual.spawn(command, args, options);

	return { ...actual, spawn };
});

const USER = "100000000000000001";

/** A stand-in downloader or transcoder, so spawning and piping are exercised without a network or the real binary. */
function fakeBinary(directory: string, name: string, body: string): string {
	const path = join(directory, `${name}.cjs`);
	writeFileSync(path, body);

	return path;
}

const print = (text: string): string => `process.stdout.write(${JSON.stringify(text)});`;
const die = (stderr: string, code = 1): string =>
	`${stderr === "" ? "" : `process.stderr.write(${JSON.stringify(`${stderr}\n`)});`} process.exitCode = ${String(code)};`;
const recordArgs = (file: string): string =>
	`require("node:fs").writeFileSync(${JSON.stringify(file)}, process.argv.slice(2).join("\\n") + "\\n");`;

describe("trackFromInfo", () => {
	/** A live stream gets no duration, so an ended broadcast is not retried as broken. */
	it("gives a live stream no duration even when one is reported", () => {
		expect(trackFromInfo({ webpage_url: "u", duration: 60, is_live: true }, USER, "youtube")).toMatchObject({
			durationMs: null,
		});
	});

	it.each([0, -5, null])("treats a duration of %p as unknown", (duration) => {
		expect(trackFromInfo({ webpage_url: "u", duration }, USER, "youtube")).toMatchObject({ durationMs: null });
	});

	/** An entry with no address is not playable, and queueing it would break the queue one track later. */
	it.each([{}, { webpage_url: "" }, { title: "No address" }])("refuses %p", (info) => {
		expect(trackFromInfo(info as TrackInfo, USER, "youtube")).toBeNull();
	});
});

describe("tracksFromInfo", () => {
	/** A 5,000-track playlist must not become a 5,000-track queue in somebody's server. */
	it("caps a very long playlist", () => {
		const entries = Array.from({ length: PLAYLIST_LIMIT + 50 }, (_, at) => ({ webpage_url: `track-${String(at)}` }));

		expect(tracksFromInfo({ entries }, USER, "youtube")).toHaveLength(PLAYLIST_LIMIT);
	});
});

describe("argumentsFor", () => {
	/** The terms are one argv entry, so a quote or a semicolon stays a search. */
	it("keeps an awkward title in a single argument", () => {
		const args = argumentsFor({ kind: "search", terms: '"; rm -rf /', source: "youtube" }, 1);

		expect(args).toHaveLength(1);
		expect(args[0]).toBe('ytsearch1:"; rm -rf /');
	});
});

describe("parseJsonLines", () => {
	/** yt-dlp prints notices among the JSON, and one of them must not lose the whole answer. */
	it("ignores lines that are not JSON", () => {
		expect(parseJsonLines('[youtube] Extracting URL\n{"id":"a"}\nWARNING: something\n')).toEqual([{ id: "a" }]);
	});
});

/** Rejects rather than resolving, so a race against it fails the test instead of passing quietly. */
/** Polls rather than sleeping a fixed span, so a slow runner is not a flake and a fast one is not a wait. */
async function waitUntil(done: () => boolean, timeoutMs: number): Promise<void> {
	const until = Date.now() + timeoutMs;

	while (!done() && Date.now() < until) {
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
}

async function deadline(ms: number): Promise<never> {
	return new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error("the process was still running after the deadline")), ms).unref();
	});
}

describe("openStream", () => {
	let directory: string;
	let fakeYtDlp: string;

	beforeAll(() => {
		directory = mkdtempSync(join(tmpdir(), "testify-fakes-"));
		fakeYtDlp = fakeBinary(directory, "fake-yt-dlp", print("OPUSBYTES"));
	});

	afterAll(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	const plan = { formatId: "251", shape: "webm-opus" } as const;

	/** Closing a stream stops the processes it started. */
	it("closing it stops the process it started", async () => {
		// The byte proves the process runs; the grandchild holding the pipe is what survives a signal to the parent.
		const slow = fakeBinary(
			directory,
			"slow-yt-dlp",
			`${print("X")} require("node:child_process").spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { stdio: "inherit" }); setTimeout(() => {}, 30000);`,
		);

		const opened = openStream("https://youtu.be/abc", plan, { ytDlp: slow, ffmpeg: null });
		const closed = new Promise<void>((resolve) => opened.stream.once("close", () => resolve()));
		// Closing before the process has started proves nothing — it is abandoning a track mid-play that has to work.
		await new Promise<void>((resolve) => opened.stream.once("data", () => resolve()));

		opened.close();

		// Wait on the event, not a fixed delay.
		await expect(Promise.race([closed, deadline(5_000)])).resolves.toBeUndefined();
	});

	/** The downloader finishes into the buffer without waiting for the player. */
	it("lets the downloader finish without waiting for the player to catch up", async () => {
		const marker = join(directory, "finished");
		// The marker is written only once the megabyte has left the process, which a full pipe would never allow.
		const bulky = fakeBinary(
			directory,
			"bulky-yt-dlp",
			`process.stdout.write(Buffer.alloc(1024 * 1024), () => require("node:fs").writeFileSync(${JSON.stringify(marker)}, "done"));`,
		);

		const opened = openStream("https://youtu.be/abc", plan, { ytDlp: bulky, ffmpeg: null });

		try {
			// Never read: only a buffer downstream lets the process reach its last line.
			await waitUntil(() => existsSync(marker), 5_000);
		} finally {
			opened.close();
		}

		expect(existsSync(marker)).toBe(true);
	});

	/**
	 * Verbatim from production: yt-dlp writes a SoundCloud stream's pieces as `--Frag<n>.part` into its working
	 * directory, which a container's app folder refused with "[Errno 13] Permission denied", so every track was empty.
	 */
	it("gives each download a writable folder of its own, and clears it once the download ends", async () => {
		const record = join(directory, "folders");
		const piecewise = fakeBinary(
			directory,
			"piecewise-yt-dlp",
			`const fs = require("node:fs"); fs.writeFileSync("--Frag1.part", "piece"); fs.appendFileSync(${JSON.stringify(record)}, process.cwd() + "\\n"); ${print("OPUS")}`,
		);
		const problems: string[] = [];
		const binaries = { ytDlp: piecewise, ffmpeg: null };
		const folders = (): string[] => (existsSync(record) ? readFileSync(record, "utf8").trim().split("\n") : []);

		// Two at once, because two servers playing SoundCloud together wrote pieces with the same names.
		const opened = [1, 2].map(() =>
			openStream("https://soundcloud.com/a/b", plan, binaries, { onProblem: (reason) => problems.push(reason) }),
		);
		try {
			await waitUntil(() => folders().length === 2, 5_000);
		} finally {
			opened.forEach((stream) => stream.close());
		}

		const [first = "", second = ""] = folders();
		await waitUntil(() => !existsSync(first) && !existsSync(second), 5_000);

		// The process id in the name is what the start-up sweep tells a stranded folder by.
		const named = expect.stringMatching(new RegExp(`^testify-music-${String(process.pid)}-`));
		expect(problems).toEqual([]);
		expect([basename(first), basename(second)]).toEqual([named, named]);
		expect(first).not.toBe(second);
		expect([existsSync(first), existsSync(second)]).toEqual([false, false]);
	});

	/** A stream that arrives whole writes no pieces, so a host with no writable temporary folder still plays it. */
	it("still plays a whole stream when no temporary folder can be made", async () => {
		jest.spyOn(jest.requireActual<typeof Fs>("node:fs"), "mkdtempSync").mockImplementationOnce(() => {
			throw Object.assign(new Error("EACCES: permission denied, mkdtemp"), { code: "EACCES" });
		});

		const opened = openStream("https://youtu.be/abc", plan, { ytDlp: fakeYtDlp, ffmpeg: null });
		try {
			const chunk = await new Promise<Buffer>((resolve) => opened.stream.once("data", resolve));
			expect(chunk.toString()).toBe("OPUSBYTES");
		} finally {
			opened.close();
		}
	});

	/** A track that needs a transcoder is refused by name when FFmpeg is missing. */
	it("refuses a track needing a transcoder when FFmpeg is missing", () => {
		expect(() =>
			openStream("https://youtu.be/abc", { formatId: "mp3", shape: "transcode" }, { ytDlp: fakeYtDlp, ffmpeg: null }),
		).toThrow(/FFmpeg/);
	});
});

describe("sweepScratchFolders", () => {
	let root: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "testify-sweep-"));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	/**
	 * A bot killed mid-track never runs its own clean-up, and a development and a production bot can share one
	 * temporary folder, so only a folder whose process is gone may be removed.
	 */
	it("removes the folders of runs that died, and leaves every live one alone", async () => {
		const dead = spawnSync(process.execPath, ["-e", ""]).pid ?? 0;
		const startedAt = Date.now() - 60_000;
		const hourAgo = new Date(Date.now() - 3_600_000);
		const folder = (name: string, modified?: Date): void => {
			mkdirSync(join(root, name));
			writeFileSync(join(root, name, "--Frag3.part"), "piece");
			if (modified !== undefined) utimesSync(join(root, name), modified, modified);
		};

		folder(`testify-music-${String(dead)}-crashed`);
		folder(`testify-music-${String(process.ppid)}-another-bot`);
		// A container starts the bot as the same process every time, so its own id alone proves nothing.
		folder(`testify-music-${String(process.pid)}-before-restart`, hourAgo);
		folder(`testify-music-${String(process.pid)}-playing-now`);
		folder("testify-music-not-a-process", hourAgo);
		folder("somebody-elses-folder", hourAgo);

		await expect(sweepScratchFolders(root, startedAt)).resolves.toBe(2);
		expect(readdirSync(root).sort()).toEqual(
			[
				"somebody-elses-folder",
				`testify-music-${String(process.pid)}-playing-now`,
				`testify-music-${String(process.ppid)}-another-bot`,
				"testify-music-not-a-process",
			].sort(),
		);
	});
});

describe("resolveTracks", () => {
	let directory: string;

	beforeAll(() => {
		directory = mkdtempSync(join(tmpdir(), "testify-resolve-"));
	});

	afterAll(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	/** A stand-in downloader printing exactly what yt-dlp prints, so the JSON round trip is real. */
	const fakeYtDlp = (name: string, body: string): string => fakeBinary(directory, name, body);

	const query = { kind: "search", terms: "lofi", source: "youtube" } as const;

	/** A known refusal reaches the reader as a sentence, not as yt-dlp's raw output logged as a failure. */
	it("names a refusal it recognises, as advice the reader can act on", async () => {
		const binary = fakeYtDlp("broken", die("ERROR: Video unavailable"));

		await expect(resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(
			/That video is unavailable/,
		);
	});

	/** Every result of the old eight-result search was extracted, so one flagged host hit the bot check eight times. */
	it("turns YouTube's bot check into advice", async () => {
		const binary = fakeYtDlp("botcheck", die("ERROR: [youtube] abc: Sign in to confirm you're not a bot."));

		const refused = resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null });
		await expect(refused).rejects.toBeInstanceOf(MusicProblemError);
		await expect(resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(/prove it is not a bot/);
	});

	/** yt-dlp's own message is the useful one when nothing recognises it — "exited 1" tells nobody why. */
	it("surfaces what the downloader complained about when it is nothing it knows", async () => {
		const binary = fakeYtDlp("strange", die("ERROR: something new"));

		await expect(resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(/something new/);
	});
});

describe("ffmpegArgs", () => {
	/** Every level but 100% re-encodes, so the re-encode is what most tracks are heard through. */
	it("re-encodes at YouTube's own best Opus rate rather than below it", () => {
		expect(ffmpegArgs().join(" ")).toContain(`-b:a ${TRANSCODE_BITRATE}`);
		expect(TRANSCODE_BITRATE).toBe("160k");
	});

	it("reads the pipe and writes Opus at the rate Discord wants", () => {
		const args = ffmpegArgs();

		expect(args).toContain("pipe:0");
		expect(args.join(" ")).toContain("-c:a libopus");
		expect(args.join(" ")).toContain("-ar 48000");
	});

	/** An untouched level must add no filter at all, so the common case is not re-levelled for nothing. */
	it("adds no filter at the track's own level", () => {
		expect(ffmpegArgs({ volume: 100 })).not.toContain("-af");
	});

	it("cannot be asked for a level past either end", () => {
		expect(ffmpegArgs({ volume: 10_000 }).join(" ")).toContain("volume=2.000");
	});

	/** `-ss` after `-i` would decode everything before the position rather than discarding it. */
	it("seeks before the input rather than after it", () => {
		const args = ffmpegArgs({ seekMs: 90_000 });

		expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"));
		expect(args[args.indexOf("-ss") + 1]).toBe("90.000");
	});
});

describe("ytDlpStreamArgs", () => {
	/** A YouTube link copied from a playlist carries `&list=`, and the whole list would go down one pipe. */
	it("refuses to follow a playlist", () => {
		expect(ytDlpStreamArgs("251", "https://youtu.be/abc?list=PL1")).toContain("--no-playlist");
	});

	/** A dropped connection part-way through a track should cost a retry, not the track. */
	it("retries rather than giving up on the first hiccup", () => {
		expect(ytDlpStreamArgs("251", "https://youtu.be/abc")).toEqual(
			expect.arrayContaining(["--retries", "--fragment-retries"]),
		);
	});
});

describe("describeTrack's memory", () => {
	let directory: string;
	let counter: string;
	let binary: string;

	beforeAll(() => {
		directory = mkdtempSync(join(tmpdir(), "testify-describe-"));
		counter = join(directory, "runs");
		// Appends a line per run, so the test can count how often YouTube would have been asked.
		binary = fakeBinary(
			directory,
			"counting-yt-dlp",
			`require("node:fs").appendFileSync(${JSON.stringify(counter)}, "run\\n"); ${print('{"webpage_url":"https://youtu.be/a","formats":[{"format_id":"251"}]}\n')}`,
		);
	});

	afterAll(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	function runs(): number {
		return existsSync(counter) ? readFileSync(counter, "utf8").trim().split("\n").length : 0;
	}

	/** A track just described is not described again when it re-opens. */
	it("asks the downloader once for a track it has just described", async () => {
		const binaries = { ytDlp: binary, ffmpeg: null };
		const before = runs();

		await describeTrack("https://youtu.be/cached", binaries);
		await describeTrack("https://youtu.be/cached", binaries);

		expect(runs() - before).toBe(1);
	});
});

describe("resolveTracks on a SoundCloud search", () => {
	let directory: string;

	beforeAll(() => {
		directory = mkdtempSync(join(tmpdir(), "testify-soundcloud-"));
	});

	afterAll(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	const fakeYtDlp = (name: string, body: string): string => fakeBinary(directory, name, body);

	const search = { kind: "search", terms: "lofi", source: "soundcloud" } as const;
	const locked = `{"webpage_url":"https://soundcloud.com/a/locked","title":"Locked","formats":[]}`;
	const open = `{"webpage_url":"https://soundcloud.com/a/open","title":"Open","formats":[{"format_id":"opus"}]}`;

	/** The bug from production: the first result was DRM-protected, and that one track failed the whole search. */
	it("steps past a DRM-protected result to one that plays", async () => {
		const record = join(directory, "args.txt");
		const binary = fakeYtDlp("mixed", `${recordArgs(record)} ${print(`${locked}\n${open}\n`)}`);

		const tracks = await resolveTracks(search, USER, { ytDlp: binary, ffmpeg: null }, { results: 1 });

		expect(tracks.map((track) => track.title)).toEqual(["Open"]);
		const args = readFileSync(record, "utf8").split("\n");
		expect(args).toContain(`scsearch${String(SOUNDCLOUD_SEARCH_DEPTH)}:lofi`);
		expect(args).toContain("--ignore-no-formats-error");
	});

	/** A typeahead search reads no formats, so filtering on them would hide every suggestion. */
	it("leaves a flat search alone", async () => {
		const binary = fakeYtDlp("flat", print('{"url":"https://soundcloud.com/a/b","title":"Flat"}\n'));

		const tracks = await resolveTracks(search, USER, { ytDlp: binary, ffmpeg: null }, { flat: true });

		expect(tracks.map((track) => track.title)).toEqual(["Flat"]);
	});

	/** YouTube is asked for one result on purpose, since request volume is what gets a host flagged. */
	it("does not widen a YouTube search", async () => {
		const record = join(directory, "yt-args.txt");
		const binary = fakeYtDlp("yt", recordArgs(record));

		await resolveTracks({ ...search, source: "youtube" }, USER, { ytDlp: binary, ffmpeg: null }, { results: 1 });

		expect(readFileSync(record, "utf8")).toContain("ytsearch1:lofi");
		expect(readFileSync(record, "utf8")).not.toContain("--ignore-no-formats-error");
	});

	/** The generic extractor fetches whatever it is handed, which made `/play` a way to reach the host's own network. */
	it("only ever runs yt-dlp's site extractors", async () => {
		const record = join(directory, "link-args.txt");
		const binary = fakeYtDlp("link", recordArgs(record));
		const link = { kind: "url", url: "https://example.com/song", source: "other" } as const;

		await resolveTracks(link, USER, { ytDlp: binary, ffmpeg: null });

		const args = readFileSync(record, "utf8").split("\n");
		expect(args[args.indexOf("--use-extractors") + 1]).toBe("default,-generic");
		const stream = ytDlpStreamArgs("251", "https://example.com/song");
		expect(stream[stream.indexOf("--use-extractors") + 1]).toBe("default,-generic");
	});

	it("turns yt-dlp's DRM refusal of a link into advice rather than a crash", async () => {
		const binary = fakeYtDlp("drm-link", die("ERROR: [soundcloud] 2398987035: This video is DRM protected"));
		const link = { kind: "url", url: "https://soundcloud.com/a/locked", source: "soundcloud" } as const;

		const refused = resolveTracks(link, USER, { ytDlp: binary, ffmpeg: null });
		await expect(refused).rejects.toBeInstanceOf(MusicProblemError);
		await expect(resolveTracks(link, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(/no bot can play it/);
	});
});
