import { randomUUID } from "node:crypto";
import { createServer, type IncomingHttpHeaders, type Server, type ServerResponse } from "node:http";
import { Readable } from "node:stream";

/**
 * A loopback relay that lets FFmpeg play a track it cannot fetch itself.
 *
 * `ffmpeg-static` ships a statically-linked-glibc binary on Linux, and its
 * `getaddrinfo` segfaults on modern glibc — every hostname dies instantly with no
 * output, so the bot resolves a track and then plays silence. Connecting to an IP
 * or to loopback is completely unaffected; only name resolution crashes.
 *
 * So Node does the part FFmpeg cannot: `register()` swaps a remote URL for a
 * `http://127.0.0.1:<port>/<id>` one, and this server fetches the real thing and
 * pipes the bytes back. FFmpeg only ever talks to loopback.
 *
 * This is a fallback, not the normal path — `resolveFfmpeg()` only turns it on
 * when the chosen binary actually fails a DNS probe, so a healthy host streams
 * directly and pays nothing for this.
 */

/** Headers worth passing through in each direction; the rest are noise or unsafe. */
const REQUEST_HEADERS = ["range", "user-agent"] as const;
const RESPONSE_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges"] as const;

export class StreamRelay {
	readonly #targets = new Map<string, string>();
	#server: Server | undefined;
	#port = 0;

	/** Starts listening on loopback only, so nothing outside the machine can reach it. */
	async start(): Promise<number> {
		if (this.#server !== undefined) return this.#port;

		const server = createServer((request, response) => {
			void this.#handle(request.url ?? "", request.headers, response);
		});

		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			// Port 0 lets the OS pick a free one, so two bots on a host cannot collide.
			server.listen(0, "127.0.0.1", resolve);
		});

		const address = server.address();
		if (address === null || typeof address === "string") throw new Error("Relay did not bind to a port");

		this.#server = server;
		this.#port = address.port;
		return this.#port;
	}

	/** Swaps a remote URL for a loopback one FFmpeg can actually open. */
	register(url: string): string {
		if (this.#server === undefined) throw new Error("Relay is not running");

		const id = randomUUID();
		this.#targets.set(id, url);
		return `http://127.0.0.1:${this.#port}/${id}`;
	}

	async stop(): Promise<void> {
		const server = this.#server;
		if (server === undefined) return;

		this.#server = undefined;
		this.#port = 0;
		this.#targets.clear();

		// `close()` alone only stops new connections and waits for open ones to end,
		// which a keep-alive client never does — so shutdown would hang forever.
		server.closeAllConnections();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}

	get port(): number {
		return this.#port;
	}

	async #handle(path: string, headers: IncomingHttpHeaders, response: ServerResponse): Promise<void> {
		const target = this.#targets.get(path.replace(/^\//, ""));
		if (target === undefined) {
			response.writeHead(404).end();
			return;
		}

		try {
			// Range matters: FFmpeg re-requests byte ranges when seeking, and a relay
			// that ignored them would restart the track from zero.
			const forwarded = new Headers();
			for (const name of REQUEST_HEADERS) {
				const value = headers[name];
				if (typeof value === "string") forwarded.set(name, value);
			}

			const upstream = await fetch(target, { headers: forwarded });
			const outgoing: Record<string, string> = {};
			for (const name of RESPONSE_HEADERS) {
				const value = upstream.headers.get(name);
				if (value !== null) outgoing[name] = value;
			}

			response.writeHead(upstream.status, outgoing);

			if (upstream.body === null) {
				response.end();
				return;
			}

			// `pipe` rather than buffering: a track is tens of megabytes and must start
			// playing before it has finished downloading.
			Readable.fromWeb(upstream.body).pipe(response);
		} catch {
			// A dead upstream closes the response rather than crashing the bot; FFmpeg
			// then reports a truncated stream, which the ERROR handler explains.
			if (!response.headersSent) response.writeHead(502);
			response.end();
		}
	}
}
