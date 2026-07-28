import { spawn, spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";
import ffmpegStatic from "ffmpeg-static";
import { relayed } from "@lib/music.util";
import { StreamRelay } from "@lib/streamRelay.util";

/**
 * The relay exists so FFmpeg never resolves a hostname, and the only convincing
 * proof is the real binary decoding real audio through it. Everything here runs on
 * loopback, so it works offline and on every platform CI covers.
 */

/** A stand-in for the CDN: serves fixed bytes and records what it was asked for. */
function startOrigin(body: Buffer, contentType = "audio/ogg") {
	const seen: { range?: string | undefined }[] = [];

	const server: Server = createServer((request, response) => {
		seen.push({ range: request.headers.range });

		const range = /bytes=(\d+)-/.exec(request.headers.range ?? "");
		if (range?.[1] !== undefined) {
			const start = Number(range[1]);
			response.writeHead(206, {
				"content-type": contentType,
				"content-range": `bytes ${start}-${body.length - 1}/${body.length}`,
			});
			response.end(body.subarray(start));
			return;
		}

		response.writeHead(200, { "content-type": contentType, "content-length": String(body.length) });
		response.end(body);
	});

	return new Promise<{ url: string; seen: typeof seen; close: () => Promise<void> }>((resolve) => {
		server.listen(0, "127.0.0.1", () => {
			const { port } = server.address() as AddressInfo;
			resolve({
				url: `http://127.0.0.1:${port}/track.ogg`,
				seen,
				close: () => new Promise<void>((done) => server.close(() => done())),
			});
		});
	});
}

/** Two seconds of real Ogg audio, made offline — no fixture file to keep in the repo. */
function makeAudio(): Buffer | null {
	if (ffmpegStatic === null) return null;

	const made = spawnSync(
		ffmpegStatic,
		["-hide_banner", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-f", "ogg", "pipe:1"],
		{ maxBuffer: 1 << 26 },
	);

	return made.status === 0 && made.stdout.length > 0 ? made.stdout : null;
}

const AUDIO = makeAudio();
const relay = new StreamRelay();

afterEach(async () => {
	await relay.stop();
});

describe("StreamRelay", () => {
	it("binds to a free port on loopback, so two bots on a host cannot collide", async () => {
		expect(await relay.start()).toBeGreaterThan(0);
	});

	it("hands back a loopback URL in place of the remote one", async () => {
		const port = await relay.start();
		const local = relay.register("https://cdn.test/a.ogg");

		expect(local.startsWith(`http://127.0.0.1:${port}/`)).toBe(true);
		expect(local).not.toContain("cdn.test");
	});

	it("gives each track its own unguessable id", async () => {
		await relay.start();
		expect(relay.register("https://cdn.test/a.ogg")).not.toBe(relay.register("https://cdn.test/a.ogg"));
	});

	it("refuses to hand out a URL before it is listening", () => {
		expect(() => new StreamRelay().register("https://cdn.test/a.ogg")).toThrow(/not running/i);
	});

	it("starting twice keeps the same port rather than leaking a server", async () => {
		expect(await relay.start()).toBe(await relay.start());
	});

	it("relays the bytes it was given", async () => {
		const origin = await startOrigin(Buffer.from("hello-audio"));
		await relay.start();

		const response = await fetch(relay.register(origin.url));

		expect(await response.text()).toBe("hello-audio");
		await origin.close();
	});

	/** FFmpeg re-requests byte ranges when seeking; dropping them restarts the track. */
	it("forwards a Range header upstream and passes the 206 back", async () => {
		const origin = await startOrigin(Buffer.from("0123456789"));
		await relay.start();

		const response = await fetch(relay.register(origin.url), { headers: { range: "bytes=4-" } });

		expect(response.status).toBe(206);
		expect(await response.text()).toBe("456789");
		expect(origin.seen.at(-1)?.range).toBe("bytes=4-");
		await origin.close();
	});

	it("passes the content type through, so FFmpeg can sniff the format", async () => {
		const origin = await startOrigin(Buffer.from("x"), "audio/mpeg");
		await relay.start();

		expect((await fetch(relay.register(origin.url))).headers.get("content-type")).toBe("audio/mpeg");
		await origin.close();
	});

	it("404s an id it does not know, rather than crashing", async () => {
		const port = await relay.start();
		expect((await fetch(`http://127.0.0.1:${port}/not-a-real-id`)).status).toBe(404);
	});

	/** A dead CDN must not take the bot down with it. */
	it("answers 502 when the upstream cannot be reached", async () => {
		await relay.start();
		const response = await fetch(relay.register("http://127.0.0.1:1/gone.ogg"));

		expect(response.status).toBe(502);
	});

	it("stops cleanly and refuses connections afterwards", async () => {
		const port = await relay.start();
		await relay.stop();

		await expect(fetch(`http://127.0.0.1:${port}/anything`)).rejects.toThrow();
	});
});

describe("relayed", () => {
	const song = {} as never;

	/** The one method the wrapper cares about, shaped like a real plugin's. */
	const fakePlugin = () => ({ getStreamURL: (_song: never) => Promise.resolve("https://cdn.test/real.ogg") });

	it("leaves the plugin alone when there is no relay", async () => {
		const plugin = fakePlugin();

		expect(relayed(plugin, undefined)).toBe(plugin);
		expect(await plugin.getStreamURL(song)).toBe("https://cdn.test/real.ogg");
	});

	it("swaps the remote URL for a loopback one", async () => {
		const plugin = fakePlugin();
		const wrapped = relayed(plugin, relay);

		const url = await wrapped.getStreamURL(song);

		expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//);
		expect(url).not.toContain("cdn.test");
	});

	it("starts the relay on first use rather than at boot", async () => {
		const plugin = relayed(fakePlugin(), relay);

		expect(relay.port).toBe(0);
		await plugin.getStreamURL(song);
		expect(relay.port).toBeGreaterThan(0);
	});
});

/**
 * The whole point, proven end to end: the same binary that segfaults on a hostname
 * decodes a track when the relay puts it on loopback.
 */
describe("FFmpeg through the relay", () => {
	const test = AUDIO === null || ffmpegStatic === null ? it.skip : it;

	test("decodes real audio served over the relay", async () => {
		const origin = await startOrigin(AUDIO!);
		await relay.start();

		// Async spawn, not spawnSync: the relay runs on this process's event loop,
		// so blocking it would deadlock against FFmpeg's own request.
		const decoded = await new Promise<{ bytes: number; signal: NodeJS.Signals | null }>((resolve) => {
			const child = spawn(
				ffmpegStatic!,
				["-hide_banner", "-i", relay.register(origin.url), "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
				{ stdio: ["ignore", "pipe", "ignore"] },
			);

			let bytes = 0;
			child.stdout.on("data", (chunk: Buffer) => (bytes += chunk.length));
			child.on("close", (_code, signal) => resolve({ bytes, signal }));
		});

		expect(decoded.signal).not.toBe("SIGSEGV");
		expect(decoded.bytes).toBeGreaterThan(0);
		await origin.close();
	}, 45_000);
});
