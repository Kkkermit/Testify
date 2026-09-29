import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	argumentsFor,
	describeTrack,
	ffmpegArgs,
	TRANSCODE_BITRATE,
	forgetDescription,
	openStream,
	parseJsonLines,
	MusicProblemError,
	resolveTracks,
	SOUNDCLOUD_SEARCH_DEPTH,
	PLAYLIST_LIMIT,
	type TrackInfo,
	trackFromInfo,
	tracksFromInfo,
	ytDlpStreamArgs,
} from "@lib/music/musicSource.util";

const USER = "100000000000000001";

describe("trackFromInfo", () => {
	it("keeps the page address rather than the expiring media one", () => {
		const track = trackFromInfo(
			{ webpage_url: "https://youtu.be/abc", url: "https://googlevideo.test/expires-in-6h", title: "Song" },
			USER,
			"youtube",
		);

		expect(track).toMatchObject({ url: "https://youtu.be/abc", title: "Song" });
	});

	it("converts seconds to milliseconds", () => {
		expect(trackFromInfo({ webpage_url: "u", duration: 212 }, USER, "youtube")).toMatchObject({
			durationMs: 212_000,
		});
	});

	/** A live stream gets no duration, so an ended broadcast is not retried as broken. */
	it("gives a live stream no duration even when one is reported", () => {
		expect(trackFromInfo({ webpage_url: "u", duration: 60, is_live: true }, USER, "youtube")).toMatchObject({
			durationMs: null,
		});
	});

	it.each([0, -5, null])("treats a duration of %p as unknown", (duration) => {
		expect(trackFromInfo({ webpage_url: "u", duration }, USER, "youtube")).toMatchObject({ durationMs: null });
	});

	it("falls back to the channel when there is no uploader", () => {
		expect(trackFromInfo({ webpage_url: "u", channel: "A Channel" }, USER, "youtube")).toMatchObject({
			author: "A Channel",
		});
	});

	it("names an untitled track rather than rendering nothing", () => {
		expect(trackFromInfo({ webpage_url: "u" }, USER, "youtube")).toMatchObject({ title: "Unknown track" });
	});

	/** An entry with no address is not playable, and queueing it would break the queue one track later. */
	it.each([{}, { webpage_url: "" }, { title: "No address" }])("refuses %p", (info) => {
		expect(trackFromInfo(info as TrackInfo, USER, "youtube")).toBeNull();
	});

	it("records who asked for it", () => {
		expect(trackFromInfo({ webpage_url: "u" }, USER, "youtube")).toMatchObject({ requestedBy: USER });
	});
});

describe("tracksFromInfo", () => {
	it("reads a single track as a queue of one", () => {
		expect(tracksFromInfo({ webpage_url: "u", title: "One" }, USER, "youtube")).toHaveLength(1);
	});

	it("reads a playlist as all of its entries", () => {
		const info = { entries: [{ webpage_url: "a" }, { webpage_url: "b" }] };

		expect(tracksFromInfo(info, USER, "youtube").map((track) => track.url)).toEqual(["a", "b"]);
	});

	/** A 5,000-track playlist must not become a 5,000-track queue in somebody's server. */
	it("caps a very long playlist", () => {
		const entries = Array.from({ length: PLAYLIST_LIMIT + 50 }, (_, at) => ({ webpage_url: `track-${String(at)}` }));

		expect(tracksFromInfo({ entries }, USER, "youtube")).toHaveLength(PLAYLIST_LIMIT);
	});

	it("drops unplayable entries instead of failing the whole playlist", () => {
		const info = { entries: [{ webpage_url: "a" }, {}, { webpage_url: "c" }] };

		expect(tracksFromInfo(info, USER, "youtube").map((track) => track.url)).toEqual(["a", "c"]);
	});

	it("returns nothing for an empty playlist", () => {
		expect(tracksFromInfo({ entries: [] }, USER, "youtube")).toEqual([]);
	});
});

describe("argumentsFor", () => {
	it("passes a link through untouched", () => {
		expect(argumentsFor({ kind: "url", url: "https://youtu.be/abc", source: "youtube" })).toEqual([
			"https://youtu.be/abc",
		]);
	});

	it("asks YouTube for a search", () => {
		expect(argumentsFor({ kind: "search", terms: "lofi", source: "youtube" }, 5)).toEqual(["ytsearch5:lofi"]);
	});

	it("asks SoundCloud when the search was aimed there", () => {
		expect(argumentsFor({ kind: "search", terms: "lofi", source: "soundcloud" }, 3)).toEqual(["scsearch3:lofi"]);
	});

	/** The terms are one argv entry, so a quote or a semicolon stays a search. */
	it("keeps an awkward title in a single argument", () => {
		const args = argumentsFor({ kind: "search", terms: '"; rm -rf /', source: "youtube" }, 1);

		expect(args).toHaveLength(1);
		expect(args[0]).toBe('ytsearch1:"; rm -rf /');
	});
});

describe("parseJsonLines", () => {
	it("reads one document per line", () => {
		expect(parseJsonLines('{"id":"a"}\n{"id":"b"}\n')).toEqual([{ id: "a" }, { id: "b" }]);
	});

	/** yt-dlp prints notices among the JSON, and one of them must not lose the whole answer. */
	it("ignores lines that are not JSON", () => {
		expect(parseJsonLines('[youtube] Extracting URL\n{"id":"a"}\nWARNING: something\n')).toEqual([{ id: "a" }]);
	});

	it("skips a truncated document rather than throwing", () => {
		expect(parseJsonLines('{"id":"a"}\n{"id":"b"\n')).toEqual([{ id: "a" }]);
	});

	it("returns nothing for empty output", () => {
		expect(parseJsonLines("")).toEqual([]);
	});
});

/** Reads a stream against a deadline, so a miswired pipeline fails rather than hanging CI. */
async function readAll(stream: NodeJS.ReadableStream, timeoutMs = 3_000): Promise<string> {
	const chunks: Buffer[] = [];

	return new Promise<string>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error("the stream delivered nothing before the deadline")), timeoutMs);
		const finish = (outcome: () => void): void => {
			clearTimeout(timer);
			outcome();
		};

		stream.on("data", (chunk) => chunks.push(chunk as Buffer));
		stream.once("end", () => finish(() => resolve(Buffer.concat(chunks).toString())));
		stream.once("error", (error: Error) => finish(() => reject(error)));
	});
}

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

	/** A stand-in binary, so the spawning and piping are exercised without a network or a real downloader. */
	beforeAll(() => {
		directory = mkdtempSync(join(tmpdir(), "testify-music-"));
		fakeYtDlp = join(directory, "fake-yt-dlp");
		writeFileSync(fakeYtDlp, "#!/bin/sh\nprintf 'OPUSBYTES'\n", { mode: 0o755 });
	});

	afterAll(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	const plan = { formatId: "251", shape: "webm-opus" } as const;

	it("hands back what the downloader wrote, with no transcoder in the way", async () => {
		const opened = openStream("https://youtu.be/abc", plan, { ytDlp: fakeYtDlp, ffmpeg: null });

		try {
			await expect(readAll(opened.stream)).resolves.toBe("OPUSBYTES");
		} finally {
			opened.close();
		}
	});

	/** Closing a stream stops the processes it started. */
	it("closing it stops the process it started", async () => {
		const slow = join(directory, "slow-yt-dlp");
		// The byte proves the process runs; the fork is what survives a signal to the parent.
		writeFileSync(slow, "#!/bin/sh\nprintf 'X'\nsleep 30 &\nwait\n", { mode: 0o755 });

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
		const bulky = join(directory, "bulky-yt-dlp");
		writeFileSync(bulky, `#!/bin/sh\ndd if=/dev/zero bs=1024 count=1024 2>/dev/null\nprintf 'done' > ${marker}\n`, {
			mode: 0o755,
		});

		const opened = openStream("https://youtu.be/abc", plan, { ytDlp: bulky, ffmpeg: null });

		try {
			// Never read: only a buffer downstream lets the process reach its last line.
			await waitUntil(() => existsSync(marker), 5_000);
		} finally {
			opened.close();
		}

		expect(existsSync(marker)).toBe(true);
	});

	it("reports what a dying downloader said rather than leaving it in a closed pipe", async () => {
		const broken = join(directory, "broken-stream-yt-dlp");
		writeFileSync(broken, "#!/bin/sh\necho 'ERROR: Sign in to confirm you are not a bot' >&2\nexit 1\n", {
			mode: 0o755,
		});

		const said: string[] = [];
		const opened = openStream(
			"https://youtu.be/abc",
			plan,
			{ ytDlp: broken, ffmpeg: null },
			{
				onProblem: (message) => said.push(message),
			},
		);

		try {
			await waitUntil(() => said.length > 0, 5_000);
		} finally {
			opened.close();
		}

		expect(said.at(0)).toContain("not a bot");
	});

	it("can be closed twice without throwing", () => {
		const opened = openStream("https://youtu.be/abc", plan, { ytDlp: fakeYtDlp, ffmpeg: null });

		expect(() => {
			opened.close();
			opened.close();
		}).not.toThrow();
	});

	/** A track that needs a transcoder is refused by name when FFmpeg is missing. */
	it("refuses a track needing a transcoder when FFmpeg is missing", () => {
		expect(() =>
			openStream("https://youtu.be/abc", { formatId: "mp3", shape: "transcode" }, { ytDlp: fakeYtDlp, ffmpeg: null }),
		).toThrow(/FFmpeg/);
	});

	it("says so plainly when there is no downloader at all", () => {
		expect(() => openStream("https://youtu.be/abc", plan, { ytDlp: null, ffmpeg: null })).toThrow(/yt-dlp/);
	});

	it("pipes the downloader through the transcoder when one is needed", async () => {
		const fakeFfmpeg = join(directory, "fake-ffmpeg");
		// Reads stdin and marks it, which is what proves the two processes were actually joined up.
		writeFileSync(fakeFfmpeg, "#!/bin/sh\nprintf 'OGG:'\ncat\n", { mode: 0o755 });

		const opened = openStream(
			"https://youtu.be/abc",
			{ formatId: "mp3", shape: "transcode" },
			{ ytDlp: fakeYtDlp, ffmpeg: fakeFfmpeg },
		);

		try {
			await expect(readAll(opened.stream)).resolves.toBe("OGG:OPUSBYTES");
		} finally {
			opened.close();
		}
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
	function fakeYtDlp(name: string, script: string): string {
		const path = join(directory, name);
		writeFileSync(path, `#!/bin/sh\n${script}\n`, { mode: 0o755 });

		return path;
	}

	const query = { kind: "search", terms: "lofi", source: "youtube" } as const;

	it("turns the downloader's output into queue tracks", async () => {
		const binary = fakeYtDlp(
			"ok",
			`printf '{"webpage_url":"https://youtu.be/a","title":"First","duration":100}\\n{"webpage_url":"https://youtu.be/b","title":"Second","duration":200}\\n'`,
		);

		const tracks = await resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null });

		expect(tracks.map((track) => track.title)).toEqual(["First", "Second"]);
		expect(tracks[0]?.durationMs).toBe(100_000);
	});

	it("returns nothing when the search found nothing", async () => {
		const binary = fakeYtDlp("empty", "printf ''");

		await expect(resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null })).resolves.toEqual([]);
	});

	/** A known refusal reaches the reader as a sentence, not as yt-dlp's raw output logged as a failure. */
	it("names a refusal it recognises, as advice the reader can act on", async () => {
		const binary = fakeYtDlp("broken", "echo 'ERROR: Video unavailable' >&2\nexit 1");

		await expect(resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(
			/That video is unavailable/,
		);
	});

	/** Every result of the old eight-result search was extracted, so one flagged host hit the bot check eight times. */
	it("turns YouTube's bot check into advice", async () => {
		const binary = fakeYtDlp(
			"botcheck",
			'echo "ERROR: [youtube] abc: Sign in to confirm you\'re not a bot. Use --cookies-from-browser" >&2\nexit 1',
		);

		const refused = resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null });
		await expect(refused).rejects.toBeInstanceOf(MusicProblemError);
		await expect(resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(/prove it is not a bot/);
	});

	/** yt-dlp's own message is the useful one when nothing recognises it — "exited 1" tells nobody why. */
	it("surfaces what the downloader complained about when it is nothing it knows", async () => {
		const binary = fakeYtDlp("strange", "echo 'ERROR: something new' >&2\nexit 1");

		await expect(resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(/something new/);
	});

	it("asks for as many results as it is told, and signs in with cookies when the host has them", async () => {
		const record = join(directory, "args.txt");
		const binary = fakeYtDlp("args", `printf '%s\\n' "$@" > '${record}'`);

		await resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null, cookies: "/secret/cookies.txt" }, { results: 1 });
		const args = readFileSync(record, "utf8").split("\n");

		expect(args).toContain("ytsearch1:lofi");
		expect(args[args.indexOf("--cookies") + 1]).toBe("/secret/cookies.txt");

		await resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null });
		expect(readFileSync(record, "utf8")).not.toContain("--cookies");
	});

	it("still fails usefully when the downloader says nothing at all", async () => {
		const binary = fakeYtDlp("silent", "exit 2");

		await expect(resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(/2/);
	});

	it("says what to do when there is no downloader installed", async () => {
		await expect(resolveTracks(query, USER, { ytDlp: null, ffmpeg: null })).rejects.toThrow(/music:setup/);
	});

	it("reads a playlist as all of its entries", async () => {
		const binary = fakeYtDlp(
			"playlist",
			`printf '{"entries":[{"webpage_url":"https://youtu.be/a"},{"webpage_url":"https://youtu.be/b"}]}\\n'`,
		);

		const tracks = await resolveTracks(query, USER, { ytDlp: binary, ffmpeg: null }, { flat: true });

		expect(tracks).toHaveLength(2);
	});

	it("describes one track, formats and all", async () => {
		const binary = fakeYtDlp(
			"describe",
			`printf '{"webpage_url":"https://youtu.be/a","formats":[{"format_id":"251","acodec":"opus","vcodec":"none","ext":"webm"}]}\\n'`,
		);

		const info = await describeTrack("https://youtu.be/a", { ytDlp: binary, ffmpeg: null });

		expect(info?.formats).toHaveLength(1);
	});

	it("describes nothing when there is no downloader", async () => {
		await expect(describeTrack("https://youtu.be/a", { ytDlp: null, ffmpeg: null })).resolves.toBeNull();
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

	it("scales the level as a fraction of the track's own", () => {
		expect(ffmpegArgs({ volume: 50 }).join(" ")).toContain("-af volume=0.500");
	});

	it("cannot be asked for a level past either end", () => {
		expect(ffmpegArgs({ volume: 10_000 }).join(" ")).toContain("volume=2.000");
	});

	it("starts at the beginning when no position is given", () => {
		expect(ffmpegArgs()).not.toContain("-ss");
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

	it("writes to standard output, which is what keeps FFmpeg off the network", () => {
		const args = ytDlpStreamArgs("251", "https://youtu.be/abc");

		expect(args[args.indexOf("-o") + 1]).toBe("-");
		expect(args.at(-1)).toBe("https://youtu.be/abc");
	});

	it("asks for the format the plan chose", () => {
		const args = ytDlpStreamArgs("251", "https://youtu.be/abc");

		expect(args[args.indexOf("-f") + 1]).toBe("251");
	});

	/** A dropped connection part-way through a track should cost a retry, not the track. */
	it("retries rather than giving up on the first hiccup", () => {
		expect(ytDlpStreamArgs("251", "https://youtu.be/abc")).toEqual(
			expect.arrayContaining(["--retries", "--fragment-retries"]),
		);
	});

	it("hands the stream the host's cookies too, or it would be refused after a search that was not", () => {
		const args = ytDlpStreamArgs("251", "https://youtu.be/abc", "/secret/cookies.txt");

		expect(args.slice(args.indexOf("--cookies"), args.indexOf("--cookies") + 2)).toEqual([
			"--cookies",
			"/secret/cookies.txt",
		]);
		expect(args.at(-1)).toBe("https://youtu.be/abc");
	});
});

describe("describeTrack's memory", () => {
	let directory: string;
	let counter: string;
	let binary: string;

	beforeAll(() => {
		directory = mkdtempSync(join(tmpdir(), "testify-describe-"));
		counter = join(directory, "runs");
		binary = join(directory, "counting-yt-dlp");
		// Appends a line per run, so the test can count how often YouTube would have been asked.
		writeFileSync(
			binary,
			`#!/bin/sh\necho run >> ${counter}\nprintf '{"webpage_url":"https://youtu.be/a","formats":[{"format_id":"251"}]}\\n'\n`,
			{ mode: 0o755 },
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

	it("asks again once the description has been forgotten", async () => {
		const binaries = { ytDlp: binary, ffmpeg: null };
		await describeTrack("https://youtu.be/forgotten", binaries);
		const before = runs();

		forgetDescription("https://youtu.be/forgotten", binaries);
		await describeTrack("https://youtu.be/forgotten", binaries);

		expect(runs() - before).toBe(1);
	});

	it("asks again once the description is stale", async () => {
		const binaries = { ytDlp: binary, ffmpeg: null };
		await describeTrack("https://youtu.be/stale", binaries, 0);
		const before = runs();

		await describeTrack("https://youtu.be/stale", binaries, 3_600_000);

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

	function fakeYtDlp(name: string, script: string): string {
		const path = join(directory, name);
		writeFileSync(path, `#!/bin/sh\n${script}\n`, { mode: 0o755 });

		return path;
	}

	const search = { kind: "search", terms: "lofi", source: "soundcloud" } as const;
	const locked = `{"webpage_url":"https://soundcloud.com/a/locked","title":"Locked","formats":[]}`;
	const open = `{"webpage_url":"https://soundcloud.com/a/open","title":"Open","formats":[{"format_id":"opus"}]}`;

	/** The bug from production: the first result was DRM-protected, and that one track failed the whole search. */
	it("steps past a DRM-protected result to one that plays", async () => {
		const record = join(directory, "args.txt");
		const binary = fakeYtDlp("mixed", `printf '%s\\n' "$@" > '${record}'\nprintf '${locked}\\n${open}\\n'`);

		const tracks = await resolveTracks(search, USER, { ytDlp: binary, ffmpeg: null }, { results: 1 });

		expect(tracks.map((track) => track.title)).toEqual(["Open"]);
		const args = readFileSync(record, "utf8").split("\n");
		expect(args).toContain(`scsearch${String(SOUNDCLOUD_SEARCH_DEPTH)}:lofi`);
		expect(args).toContain("--ignore-no-formats-error");
	});

	it("says so, as advice, when every result is protected", async () => {
		const binary = fakeYtDlp("all-locked", `printf '${locked}\\n'`);

		await expect(resolveTracks(search, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(/DRM-protected/);
	});

	/** A typeahead search reads no formats, so filtering on them would hide every suggestion. */
	it("leaves a flat search alone", async () => {
		const binary = fakeYtDlp("flat", `printf '{"url":"https://soundcloud.com/a/b","title":"Flat"}\\n'`);

		const tracks = await resolveTracks(search, USER, { ytDlp: binary, ffmpeg: null }, { flat: true });

		expect(tracks.map((track) => track.title)).toEqual(["Flat"]);
	});

	/** YouTube is asked for one result on purpose, since request volume is what gets a host flagged. */
	it("does not widen a YouTube search", async () => {
		const record = join(directory, "yt-args.txt");
		const binary = fakeYtDlp("yt", `printf '%s\\n' "$@" > '${record}'`);

		await resolveTracks({ ...search, source: "youtube" }, USER, { ytDlp: binary, ffmpeg: null }, { results: 1 });

		expect(readFileSync(record, "utf8")).toContain("ytsearch1:lofi");
		expect(readFileSync(record, "utf8")).not.toContain("--ignore-no-formats-error");
	});

	it("turns yt-dlp's DRM refusal of a link into advice rather than a crash", async () => {
		const binary = fakeYtDlp(
			"drm-link",
			`echo 'ERROR: [soundcloud] 2398987035: This video is DRM protected' >&2\nexit 1`,
		);
		const link = { kind: "url", url: "https://soundcloud.com/a/locked", source: "soundcloud" } as const;

		const refused = resolveTracks(link, USER, { ytDlp: binary, ffmpeg: null });
		await expect(refused).rejects.toBeInstanceOf(MusicProblemError);
		await expect(resolveTracks(link, USER, { ytDlp: binary, ffmpeg: null })).rejects.toThrow(/no bot can play it/);
	});
});
