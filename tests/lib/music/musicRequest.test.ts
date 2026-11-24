import { type Guild, type VoiceBasedChannel } from "discord.js";
import { UserFacingError } from "@core/errors";
import { type QueueState, type Track } from "@lib/music/music.types";
import { hostAdvice, queueRequest, requestedQuery } from "@lib/music/musicActions.util";
import { finished } from "@lib/music/musicQueue.util";
import type * as Source from "@lib/music/musicSource.util";

jest.mock("@lib/music/musicSource.util", () => ({
	MusicProblemError: jest.requireActual<typeof Source>("@lib/music/musicSource.util").MusicProblemError,
	resolveTracks: jest.fn(),
}));
jest.mock("@lib/music/musicBinaries.util", () => ({ findBinaries: () => ({ ytDlp: "/bin/yt-dlp", ffmpeg: null }) }));
jest.mock("@lib/music/musicSession.util", () => ({ sessionFor: jest.fn(), findSession: jest.fn() }));
jest.mock("@database/repositories/botSettingsRepository", () => ({ getBotSettings: jest.fn() }));

const { resolveTracks } = jest.requireMock("@lib/music/musicSource.util");
const { sessionFor, findSession } = jest.requireMock("@lib/music/musicSession.util");
const { getBotSettings } = jest.requireMock("@database/repositories/botSettingsRepository");

function track(title: string): Track {
	return {
		url: `https://youtu.be/${title}`,
		title,
		author: null,
		durationMs: 180_000,
		thumbnail: null,
		source: "youtube",
		requestedBy: "100000000000000001",
	};
}

function fakeSession(queue: QueueState, active: boolean) {
	return {
		queue,
		active,
		textChannelId: null as string | null,
		connect: jest.fn(() => Promise.resolve()),
		play: jest.fn(() => Promise.resolve()),
	};
}

const lensTrack = jest.fn();

function request(next = false) {
	return {
		guild: { id: "guild-1" } as Guild,
		client: { env: {}, logger: { warn: jest.fn() }, shardlens: { track: lensTrack } } as never,
		channel: { id: "voice-1" } as VoiceBasedChannel,
		query: requestedQuery("never gonna give you up"),
		requestedBy: "100000000000000001",
		next,
		textChannelId: "text-1",
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	getBotSettings.mockResolvedValue({ musicSources: "youtube" });
	resolveTracks.mockResolvedValue([track("new"), track("second result")]);
});

describe("queueRequest", () => {
	/** After the last song ended, the next request sat in the queue instead of playing. */
	it("plays straight away once the previous song has finished", async () => {
		const session = fakeSession(finished({ tracks: [track("done")], index: 0, loop: "off" }), false);
		sessionFor.mockReturnValue(session);

		const { note } = await queueRequest(request());

		expect(session.play).toHaveBeenCalledWith(1);
		expect(session.queue.tracks.map((entry) => entry.title)).toEqual(["done", "new"]);
		expect(note).toBe("Playing **new**.");
	});

	it("queues behind a song that is playing", async () => {
		const session = fakeSession({ tracks: [track("current")], index: 0, loop: "off" }, true);
		sessionFor.mockReturnValue(session);

		const { note } = await queueRequest(request());

		expect(session.play).not.toHaveBeenCalled();
		expect(note).toBe("Added **new** to the queue.");
	});

	/** Two requests arriving while nothing played both started their own track, and one cut the other off. */
	it("starts one of two requests that arrive together, and queues the other behind it", async () => {
		const session = fakeSession({ tracks: [], index: -1, loop: "off" }, false);
		let joined: () => void = () => undefined;
		session.connect.mockImplementationOnce(() => new Promise<void>((resolve) => (joined = resolve)));
		session.play.mockImplementation(() => {
			session.active = true;
			return Promise.resolve();
		});
		sessionFor.mockReturnValue(session);
		resolveTracks.mockResolvedValueOnce([track("first")]).mockResolvedValueOnce([track("second")]);

		const first = queueRequest(request());
		await new Promise((resolve) => setImmediate(resolve));
		const second = await queueRequest(request());
		joined();

		expect(session.play).toHaveBeenCalledTimes(1);
		expect([(await first).note, second.note]).toEqual(["Added **first** to the queue.", "Playing **second**."]);
	});

	/** Only the first result is played, so the search asks YouTube for one rather than eight. */
	it("asks the source for a single result when searching", async () => {
		sessionFor.mockReturnValue(fakeSession({ tracks: [], index: -1, loop: "off" }, false));

		await queueRequest(request());

		expect(resolveTracks).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), {
			flat: false,
			results: 1,
		});
	});

	/** The reader is told what happened; the host is told what to do about it, once, in the log. */
	it("tells the host what to do when YouTube refuses it, and still refuses the reader", async () => {
		sessionFor.mockReturnValue(fakeSession({ tracks: [], index: -1, loop: "off" }, false));
		const { MusicProblemError } = jest.requireActual<typeof Source>("@lib/music/musicSource.util");
		resolveTracks.mockRejectedValue(new MusicProblemError({ kind: "bot-check", advice: "YouTube asked." }));
		const asked = request();

		await expect(queueRequest(asked)).rejects.toThrow(/YouTube asked/);
		expect((asked.client as unknown as { logger: { warn: jest.Mock } }).logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("SoundCloud only"),
		);
	});
	/** "The page needs to be reloaded" used to escape as a crash; it is a refusal, and the host is told what fixes it. */
	it("tells the host what to do when YouTube refuses its session, and still refuses the reader", async () => {
		sessionFor.mockReturnValue(fakeSession({ tracks: [], index: -1, loop: "off" }, false));
		const { MusicProblemError } = jest.requireActual<typeof Source>("@lib/music/musicSource.util");
		resolveTracks.mockRejectedValue(new MusicProblemError({ kind: "session", advice: "YouTube stopped trusting." }));
		const asked = request();

		await expect(queueRequest(asked)).rejects.toThrow(/YouTube stopped trusting/);
		expect((asked.client as unknown as { logger: { warn: jest.Mock } }).logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("npm run music:setup"),
		);
	});
});

describe("queueRequest with the owner's choice of sources", () => {
	const { MusicProblemError } = jest.requireActual<typeof Source>("@lib/music/musicSource.util");
	const botCheck = (): Error => new MusicProblemError({ kind: "bot-check", advice: "YouTube asked." });
	const askedFor = (call: number): { source: string } => resolveTracks.mock.calls[call]?.[0] as { source: string };

	beforeEach(() => {
		sessionFor.mockReturnValue(fakeSession({ tracks: [], index: -1, loop: "off" }, false));
	});

	/** Under "both", a host YouTube has flagged still plays what was asked for. */
	it("tries SoundCloud when YouTube refuses a plain search, and says so", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "both" });
		resolveTracks.mockRejectedValueOnce(botCheck()).mockResolvedValueOnce([track("from soundcloud")]);

		const { note } = await queueRequest(request());

		expect(askedFor(0).source).toBe("youtube");
		expect(askedFor(1).source).toBe("soundcloud");
		expect(note).toMatch(/Playing \*\*from soundcloud\*\*.*came from SoundCloud/);
	});
	it("tries SoundCloud when YouTube refuses the host's session", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "both" });
		resolveTracks
			.mockRejectedValueOnce(new MusicProblemError({ kind: "session", advice: "YouTube stopped trusting." }))
			.mockResolvedValueOnce([track("from soundcloud")]);

		await queueRequest(request());

		expect(askedFor(1).source).toBe("soundcloud");
	});

	/** A link names one video; a different song from another service is not what was asked for. */
	it("does not swap a YouTube link for a SoundCloud search, but points at SoundCloud", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "both" });
		resolveTracks.mockRejectedValue(botCheck());

		await expect(queueRequest({ ...request(), query: requestedQuery("https://youtu.be/abc") })).rejects.toThrow(
			/YouTube asked\. Put `sc:`/,
		);
		expect(resolveTracks).toHaveBeenCalledTimes(1);
	});

	/** Refused before yt-dlp is spawned, so turning YouTube off also stops every request to it. */
	it("refuses a YouTube link without asking YouTube when only SoundCloud is on", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "soundcloud" });

		await expect(queueRequest({ ...request(), query: requestedQuery("https://youtu.be/abc") })).rejects.toThrow(
			/switched YouTube off/,
		);
		expect(resolveTracks).not.toHaveBeenCalled();
	});
});

describe("requestedQuery", () => {
	it("refuses Spotify by name, because its streams are DRM-protected", () => {
		expect(() => requestedQuery("https://open.spotify.com/track/abc")).toThrow(/Spotify/);
	});

	it("refuses nothing at all", () => {
		expect(() => requestedQuery("   ")).toThrow(UserFacingError);
	});
});

describe("hostAdvice", () => {
	it("says nothing for a refusal that is about the track", () => {
		expect(hostAdvice("unavailable")).toBeNull();
		expect(hostAdvice("drm")).toBeNull();
	});

	/** A refusal is counted by the service asked and what it said, which is how a flagged host shows on the console. */
	it("counts a refusal by its service and reason", async () => {
		sessionFor.mockReturnValue(fakeSession({ tracks: [], index: -1, loop: "off" }, false));
		const { MusicProblemError } = jest.requireActual<typeof Source>("@lib/music/musicSource.util");
		resolveTracks.mockRejectedValue(new MusicProblemError({ kind: "bot-check", advice: "YouTube asked." }));

		await expect(queueRequest(request())).rejects.toThrow();
		expect(lensTrack).toHaveBeenCalledWith(
			"music_refused",
			{ source: "youtube", cause: "youtube/bot-check" },
			{ guildId: "guild-1" },
		);
	});
});

describe("counting tracks", () => {
	/** One listener per session, attached as it opens, so a long queue is not counted once per request. */
	it("counts a fresh start and a give-up, and nothing for a track opened again", async () => {
		const session = { ...fakeSession({ tracks: [], index: -1, loop: "off" }, false), on: jest.fn() };
		sessionFor.mockReturnValue(session);
		findSession.mockReturnValueOnce(null);

		await queueRequest(request());
		await queueRequest(request());

		expect(session.on).toHaveBeenCalledTimes(1);
		const listen = session.on.mock.calls[0]?.[0] as (event: unknown) => void;
		listen({ kind: "track", track: track("a"), resumed: false });
		listen({ kind: "track", track: track("a"), resumed: true });
		listen({ kind: "failed", track: track("b"), reason: "x", problem: "drm" });

		expect(lensTrack.mock.calls).toEqual([
			["music_played", { source: "youtube" }, { guildId: "guild-1" }],
			["music_skipped", { source: "youtube", cause: "youtube/drm" }, { guildId: "guild-1" }],
		]);
	});
});
