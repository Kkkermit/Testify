import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { type Guild } from "discord.js";
import { DEFAULT_VOLUME, UNITY_VOLUME } from "@lib/music/music.constants";
import { type MusicBinaries, type Track } from "@lib/music/music.types";
import {
	destroyAllSessions,
	findSession,
	MusicSession,
	NOTICE_MS,
	PANEL_REFRESH_MS,
	type SessionEvent,
	sessionFor,
} from "@lib/music/musicSession.util";

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

jest.mock("@lib/music/musicSource.util", () => ({
	describeTrack: jest.fn(),
	openStream: jest.fn(),
	forgetDescription: jest.fn(),
}));

const DESCRIBED = {
	formats: [{ format_id: "251", acodec: "opus", vcodec: "none", ext: "webm", protocol: "https", abr: 160 }],
};

const LOGGER = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), trace: jest.fn() };
const BINARIES: MusicBinaries = { ytDlp: "/bin/yt-dlp", ffmpeg: null };
/** Only a host with FFmpeg can re-encode, which is what every level and seek below depends on. */
const WITH_FFMPEG: MusicBinaries = { ytDlp: "/bin/yt-dlp", ffmpeg: "/bin/ffmpeg" };

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

function sessionWith(titles: string[], binaries = BINARIES): { session: MusicSession; events: SessionEvent[] } {
	const session = new MusicSession("guild-1", binaries, LOGGER as never);
	session.queue = { tracks: titles.map((title) => track(title)), index: 0, loop: "off" };

	const events: SessionEvent[] = [];
	session.on((event) => events.push(event));

	return { session, events };
}

beforeEach(() => {
	player = new FakePlayer();
	resource = { playbackDuration: 0 };
	jest.clearAllMocks();

	// `clearAllMocks` forgets the calls and keeps the implementation, so one test's stub would otherwise leak into the next.
	const { describeTrack, openStream } = jest.requireMock("@lib/music/musicSource.util");
	describeTrack.mockImplementation(() => Promise.resolve(DESCRIBED));
	openStream.mockImplementation(() => ({
		stream: Readable.from([Buffer.from("x")]),
		plan: { formatId: "251", shape: "webm-opus" },
		close: jest.fn(),
	}));
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
	/** A stalled track is retried rather than skipped. */
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
		const { describeTrack } = jest.requireMock("@lib/music/musicSource.util");
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

describe("the volume", () => {
	it("starts at half the track's level where FFmpeg can apply it", () => {
		expect(sessionWith(["a"], WITH_FFMPEG).session.volume).toBe(DEFAULT_VOLUME);
		expect(DEFAULT_VOLUME).toBe(50);
	});

	/** A host with no FFmpeg plays at the track's own level, so the panel must not claim otherwise. */
	it("reports the track's own level where nothing can change it", () => {
		expect(sessionWith(["a"]).session.volume).toBe(UNITY_VOLUME);
	});

	it("filters the first track through FFmpeg, because the starting level is not the track's own", async () => {
		const { openStream } = jest.requireMock("@lib/music/musicSource.util");
		const { session } = sessionWith(["a"], WITH_FFMPEG);

		await session.play(0);

		expect(openStream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ shape: "transcode" }),
			WITH_FFMPEG,
			expect.objectContaining({ volume: DEFAULT_VOLUME }),
		);
	});

	it("cannot be set past either end", () => {
		const { session } = sessionWith(["a"], WITH_FFMPEG);

		expect(session.setVolume(10_000)).toBe(200);
		expect(session.setVolume(-10)).toBe(0);
	});

	it("is only offered where something can re-encode", () => {
		expect(sessionWith(["a"], WITH_FFMPEG).session.canSetVolume).toBe(true);
		expect(sessionWith(["a"]).session.canSetVolume).toBe(false);
	});

	it("re-opens the current track through FFmpeg, from where it had got to", async () => {
		const { openStream } = jest.requireMock("@lib/music/musicSource.util");
		const { session } = sessionWith(["a"], WITH_FFMPEG);

		await session.play(0);
		resource.playbackDuration = 45_000;
		session.setVolume(60);
		await new Promise((resolve) => setImmediate(resolve));

		expect(openStream).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({ shape: "transcode" }),
			WITH_FFMPEG,
			expect.objectContaining({ volume: 60, seekMs: 45_000 }),
		);
	});

	/** A re-opened stream keeps its offset, so a volume change does not make the track look broken. */
	it("does not make a track that then finishes look like one that came apart", async () => {
		const { session, events } = sessionWith(["a", "b"], WITH_FFMPEG);

		await session.play(0);
		resource.playbackDuration = 100_000;
		session.setVolume(60);
		await new Promise((resolve) => setImmediate(resolve));

		resource.playbackDuration = 80_000;
		await player.goIdle();

		expect(events.filter((event) => event.kind === "retrying")).toEqual([]);
		expect(session.queue.index).toBe(1);
	});

	/** The player falling idle while a new stream opens is not the track ending. */
	it("does not act on the player falling idle while the new stream is being opened", async () => {
		const { describeTrack } = jest.requireMock("@lib/music/musicSource.util");
		const { session, events } = sessionWith(["a", "b"], WITH_FFMPEG);

		await session.play(0);

		let release: (info: unknown) => void = () => undefined;
		describeTrack.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
		session.setVolume(60);
		await player.goIdle();

		expect(events.filter((event) => event.kind === "retrying")).toEqual([]);
		expect(describeTrack).toHaveBeenCalledTimes(2);
		expect(session.queue.index).toBe(0);

		release(DESCRIBED);
		await new Promise((resolve) => setImmediate(resolve));
	});

	it("leaves a host with no FFmpeg passing the bytes through untouched", async () => {
		const { openStream } = jest.requireMock("@lib/music/musicSource.util");
		const { session } = sessionWith(["a"]);

		session.setVolume(60);
		await session.play(0);

		expect(openStream).toHaveBeenLastCalledWith(
			expect.any(String),
			{ formatId: "251", shape: "webm-opus" },
			BINARIES,
			expect.objectContaining({ volume: 60, seekMs: 0 }),
		);
	});
});

describe("previous", () => {
	it("goes back a track", async () => {
		const { session } = sessionWith(["a", "b"]);
		await session.play(1);

		session.previous();
		await new Promise((resolve) => setImmediate(resolve));

		expect(session.queue.index).toBe(0);
	});

	it("starts the first track again rather than falling off the front of the queue", async () => {
		const { session } = sessionWith(["a", "b"]);
		await session.play(0);

		session.previous();
		await new Promise((resolve) => setImmediate(resolve));

		expect(session.queue.index).toBe(0);
	});
});

describe("a queue where nothing can be opened", () => {
	/** Under a queue loop, stepping past every broken track would otherwise walk the queue for ever. */
	it("ends rather than looping for ever", async () => {
		const { describeTrack } = jest.requireMock("@lib/music/musicSource.util");
		describeTrack.mockResolvedValue({ formats: [] });

		const { session, events } = sessionWith(["a", "b"]);
		session.queue = { ...session.queue, loop: "queue" };

		await session.play(0);

		expect(events.filter((event) => event.kind === "failed")).toHaveLength(3);
		expect(events.at(-1)?.kind).toBe("queue-ended");
	});

	it("steps past a track yt-dlp could not describe at all", async () => {
		const { describeTrack } = jest.requireMock("@lib/music/musicSource.util");
		describeTrack.mockRejectedValueOnce(new Error("yt-dlp exited 1"));

		const { session, events } = sessionWith(["broken", "fine"]);
		await session.play(0);

		expect(events).toContainEqual(expect.objectContaining({ kind: "failed" }));
		expect(session.queue.index).toBe(1);
	});
});

describe("the live panel", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	/** A progress bar that only moves when somebody presses something is not a progress bar. */
	it("rewrites the message as the track plays", async () => {
		const edit = jest.fn(() => Promise.resolve(undefined));
		const { session } = sessionWith(["a"]);

		await session.play(0);
		session.watchPanel({ userId: "100000000000000001", page: 0, edit });
		edit.mockClear();

		jest.advanceTimersByTime(PANEL_REFRESH_MS);

		expect(edit).toHaveBeenCalledTimes(1);
	});

	it("stops rewriting once the queue has ended", async () => {
		const edit = jest.fn(() => Promise.resolve(undefined));
		const { session } = sessionWith(["a"]);

		await session.play(0);
		session.watchPanel({ userId: "100000000000000001", page: 0, edit });

		session.stop();
		player.state = { status: "idle" };
		player.emit("idle");
		await Promise.resolve();
		edit.mockClear();

		jest.advanceTimersByTime(PANEL_REFRESH_MS * 3);

		expect(edit).not.toHaveBeenCalled();
	});

	/** A deleted message answers with a 404 for ever, so retrying it every ten seconds is pure noise. */
	it("drops a panel that cannot be edited rather than retrying it", async () => {
		const edit = jest.fn(() => Promise.reject(new Error("Unknown Message")));
		const { session } = sessionWith(["a"]);

		await session.play(0);
		session.watchPanel({ userId: "100000000000000001", page: 0, edit });

		jest.advanceTimersByTime(PANEL_REFRESH_MS);
		await Promise.resolve();
		await Promise.resolve();
		edit.mockClear();

		jest.advanceTimersByTime(PANEL_REFRESH_MS * 3);

		expect(edit).not.toHaveBeenCalled();
	});
});

describe("a downloader that says why it stopped", () => {
	/** The options the session handed its most recent stream, which is where it listens for the downloader. */
	function lastProblemHandler(): (reason: string) => void {
		const { openStream } = jest.requireMock("@lib/music/musicSource.util");
		const calls = (openStream as jest.Mock).mock.calls;
		const options = calls.at(-1)?.[3] as { onProblem?: (reason: string) => void };

		return options.onProblem ?? (() => undefined);
	}

	/** A 403 gets one fresh try, then the queue moves on and says why. */
	it("gives a 403 one fresh try, then moves on and says why", async () => {
		const { session, events } = sessionWith(["a", "b"]);
		await session.play(0);

		lastProblemHandler()("ERROR: unable to download video data: HTTP Error 403: Forbidden");
		await player.goIdle();
		expect(events.filter((event) => event.kind === "retrying")).toHaveLength(1);

		lastProblemHandler()("ERROR: unable to download video data: HTTP Error 403: Forbidden");
		await player.goIdle();

		expect(session.queue.index).toBe(1);
		expect(session.notice()).toContain("music:setup");
	});

	it("does not retry a video YouTube will not serve to anybody", async () => {
		const { session, events } = sessionWith(["a", "b"]);
		await session.play(0);

		lastProblemHandler()("ERROR: [youtube] abc: Video unavailable");
		await player.goIdle();

		expect(events.filter((event) => event.kind === "retrying")).toEqual([]);
		expect(session.queue.index).toBe(1);
	});

	/** Looking afresh is the point of the one retry, so the cached description must not be reused for it. */
	it("forgets the cached description of a refused track", async () => {
		const { forgetDescription } = jest.requireMock("@lib/music/musicSource.util");
		const { session } = sessionWith(["a"]);
		await session.play(0);

		lastProblemHandler()("HTTP Error 403: Forbidden");

		expect(forgetDescription).toHaveBeenCalledWith("https://youtu.be/a", BINARIES);
	});

	/** A stream the session closed on purpose — a skip, a volume change — can still report as it dies. */
	it("ignores a complaint from a stream that has already been replaced", async () => {
		const { session, events } = sessionWith(["a", "b"]);
		await session.play(0);
		const stale = lastProblemHandler();

		await session.play(0);
		stale("ERROR: [youtube] abc: Video unavailable");
		await player.goIdle();

		expect(events.filter((event) => event.kind === "retrying")).toHaveLength(1);
	});

	it("keeps the usual retries for a break the downloader said nothing about", async () => {
		const { session, events } = sessionWith(["a", "b"]);
		await session.play(0);

		for (let attempt = 0; attempt < 4; attempt++) await player.goIdle();

		expect(events.filter((event) => event.kind === "retrying")).toHaveLength(3);
	});
});

describe("the notice", () => {
	it("shows on the panel when a press brought no line of its own", async () => {
		const { describeTrack } = jest.requireMock("@lib/music/musicSource.util");
		describeTrack.mockResolvedValueOnce({ formats: [{ format_id: "1", acodec: "mp3", vcodec: "none", ext: "mp3" }] });
		const { session } = sessionWith(["broken", "fine"]);

		await session.play(0);

		expect(JSON.stringify(session.render("100000000000000001").components[0]?.toJSON())).toContain("Skipped");
	});

	it("gives way to what a press says", async () => {
		const { describeTrack } = jest.requireMock("@lib/music/musicSource.util");
		describeTrack.mockResolvedValueOnce({ formats: [] });
		const { session } = sessionWith(["broken", "fine"]);

		await session.play(0);

		const rendered = JSON.stringify(session.render("100000000000000001", "Paused.").components[0]?.toJSON());
		expect(rendered).toContain("Paused.");
		expect(rendered).not.toContain("Skipped");
	});

	it("stops being shown once it is old news", async () => {
		const { describeTrack } = jest.requireMock("@lib/music/musicSource.util");
		describeTrack.mockResolvedValueOnce({ formats: [] });
		const { session } = sessionWith(["broken", "fine"]);

		await session.play(0);

		expect(session.notice(Date.now() + NOTICE_MS + 1)).toBeUndefined();
	});
});
