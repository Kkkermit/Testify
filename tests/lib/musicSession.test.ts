import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { type Guild } from "discord.js";
import { type Track } from "@lib/musicQueue.util";
import { destroyAllSessions, findSession, MusicSession, type SessionEvent, sessionFor } from "@lib/musicSession.util";

/** A stand-in player, so the idle wiring can be driven without a voice connection. */
class FakePlayer extends EventEmitter {
	state: { status: string } = { status: "idle" };
	play = jest.fn(() => {
		this.state = { status: "playing" };
	});
	stop = jest.fn(() => {
		this.state = { status: "idle" };
		return true;
	});
	pause = jest.fn(() => {
		this.state = { status: "paused" };
		return true;
	});
	unpause = jest.fn(() => {
		this.state = { status: "playing" };
		return true;
	});
	/** Drives what the real player emits when a track ends, however it ended. */
	async goIdle(): Promise<void> {
		this.state = { status: "idle" };
		this.emit("idle");
		await new Promise((resolve) => setImmediate(resolve));
	}
}

let player: FakePlayer;
let resource: { playbackDuration: number };

jest.mock("@discordjs/voice", () => ({
	AudioPlayerStatus: { Idle: "idle", Playing: "playing", Paused: "paused" },
	VoiceConnectionStatus: {
		Ready: "ready",
		Disconnected: "disconnected",
		Signalling: "signalling",
		Connecting: "connecting",
	},
	StreamType: { WebmOpus: "webm/opus", OggOpus: "ogg/opus", Arbitrary: "arbitrary" },
	NoSubscriberBehavior: { Pause: "pause" },
	createAudioPlayer: () => player,
	createAudioResource: () => resource,
	joinVoiceChannel: () => ({
		joinConfig: { channelId: "chan" },
		on: jest.fn(),
		subscribe: jest.fn(),
		destroy: jest.fn(),
	}),
	entersState: jest.fn(() => Promise.resolve(undefined)),
}));

jest.mock("@lib/musicSource.util", () => ({
	describeTrack: jest.fn(() =>
		Promise.resolve({
			formats: [{ format_id: "251", acodec: "opus", vcodec: "none", ext: "webm", protocol: "https", abr: 160 }],
		}),
	),
	openStream: jest.fn(() => ({
		stream: Readable.from([Buffer.from("x")]),
		plan: { formatId: "251", shape: "webm-opus" },
		close: jest.fn(),
	})),
}));

const LOGGER = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), trace: jest.fn() };
const BINARIES = { ytDlp: "/bin/yt-dlp", ffmpeg: null };

function track(title: string, durationMs: number | null = 180_000): Track {
	return {
		url: `https://youtu.be/${title}`,
		title,
		author: null,
		durationMs,
		thumbnail: null,
		source: "youtube",
		requestedBy: "100000000000000001",
	};
}

function sessionWith(titles: string[]): { session: MusicSession; events: SessionEvent[] } {
	const session = new MusicSession("guild-1", BINARIES, LOGGER as never);
	session.queue = { tracks: titles.map((title) => track(title)), index: 0, loop: "off" };

	const events: SessionEvent[] = [];
	session.on((event) => events.push(event));

	return { session, events };
}

beforeEach(() => {
	player = new FakePlayer();
	resource = { playbackDuration: 0 };
	jest.clearAllMocks();
});

afterEach(() => {
	destroyAllSessions();
});

describe("a track that finishes", () => {
	it("moves the queue on", async () => {
		const { session } = sessionWith(["a", "b"]);
		await session.play(0);

		resource.playbackDuration = 180_000;
		await player.goIdle();

		expect(session.queue.index).toBe(1);
	});

	it("stops when it was the last one", async () => {
		const { session, events } = sessionWith(["only"]);
		await session.play(0);

		resource.playbackDuration = 180_000;
		await player.goIdle();

		expect(events.map((event) => event.kind)).toContain("queue-ended");
	});
});

describe("a track that comes apart", () => {
	/**
	 * The bug the whole design exists for: a stalled stream arrives as the same idle event a finished track
	 * does, and advancing on both is what skipped three songs in a row on a bad connection.
	 */
	it("is retried rather than skipped", async () => {
		const { session, events } = sessionWith(["a", "b"]);
		await session.play(0);

		resource.playbackDuration = 20_000;
		await player.goIdle();

		expect(session.queue.index).toBe(0);
		expect(events).toContainEqual(expect.objectContaining({ kind: "retrying", attempt: 1 }));
	});

	it("is given up on eventually, so the queue is never stuck on one song", async () => {
		const { session } = sessionWith(["a", "b"]);
		await session.play(0);

		resource.playbackDuration = 20_000;
		for (let attempt = 0; attempt < 4; attempt++) await player.goIdle();

		expect(session.queue.index).toBe(1);
	});
});

describe("skipping", () => {
	/** A half-played track that somebody skipped must not be mistaken for a broken one and replayed. */
	it("moves on even though the track played only part of its length", async () => {
		const { session, events } = sessionWith(["a", "b"]);
		await session.play(0);

		resource.playbackDuration = 5_000;
		session.skip();
		await player.goIdle();

		expect(session.queue.index).toBe(1);
		expect(events.filter((event) => event.kind === "retrying")).toEqual([]);
	});
});

describe("stopping", () => {
	it("ends the queue rather than advancing", async () => {
		const { session, events } = sessionWith(["a", "b", "c"]);
		await session.play(0);

		session.stop();
		await player.goIdle();

		expect(events.map((event) => event.kind)).toContain("queue-ended");
	});
});

describe("a track with nothing playable", () => {
	it("is reported by name and stepped over rather than played as silence", async () => {
		const { describeTrack } = jest.requireMock("@lib/musicSource.util");
		describeTrack.mockResolvedValueOnce({ formats: [{ format_id: "1", acodec: "mp3", vcodec: "none", ext: "mp3" }] });

		const { session, events } = sessionWith(["broken", "fine"]);
		await session.play(0);

		expect(events).toContainEqual(expect.objectContaining({ kind: "failed" }));
		expect(session.queue.index).toBe(1);
	});
});

describe("the registry", () => {
	it("hands the same session back for the same guild", () => {
		const guild = { id: "guild-9" } as Guild;
		const first = sessionFor(guild, BINARIES, LOGGER as never);

		expect(sessionFor(guild, BINARIES, LOGGER as never)).toBe(first);
	});

	/** Two guilds sharing one connection would put one server's music into another's channel. */
	it("keeps guilds apart", () => {
		const one = sessionFor({ id: "guild-a" } as Guild, BINARIES, LOGGER as never);
		const two = sessionFor({ id: "guild-b" } as Guild, BINARIES, LOGGER as never);

		expect(one).not.toBe(two);
		expect(findSession("guild-a")).toBe(one);
	});

	it("destroys every session on shutdown, so a restart leaves no bot sitting in a channel", () => {
		sessionFor({ id: "guild-c" } as Guild, BINARIES, LOGGER as never);
		sessionFor({ id: "guild-d" } as Guild, BINARIES, LOGGER as never);

		destroyAllSessions();

		expect(findSession("guild-c")).toBeNull();
		expect(findSession("guild-d")).toBeNull();
	});

	it("forgets a session once it is destroyed", async () => {
		const { session } = sessionWith(["a"]);
		await session.play(0);
		session.destroy();

		expect(findSession("guild-1")).toBeNull();
	});

	/** A listener that throws must not take the session down with it. */
	it("survives a listener that throws", async () => {
		const { session } = sessionWith(["a"]);
		session.on(() => {
			throw new Error("boom");
		});

		await expect(session.play(0)).resolves.toBeUndefined();
	});
});
