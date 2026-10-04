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
const { sessionFor } = jest.requireMock("@lib/music/musicSession.util");
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

function request(next = false) {
	return {
		guild: { id: "guild-1" } as Guild,
		client: { env: {}, logger: { warn: jest.fn() } } as never,
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
	/** The bug this exists for: after the last song ended, the next request sat in the queue instead of playing. */
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
	it("tells the host how to get past YouTube's bot check, and still refuses the reader", async () => {
		sessionFor.mockReturnValue(fakeSession({ tracks: [], index: -1, loop: "off" }, false));
		const { MusicProblemError } = jest.requireActual<typeof Source>("@lib/music/musicSource.util");
		resolveTracks.mockRejectedValue(new MusicProblemError({ kind: "bot-check", advice: "YouTube asked." }));
		const asked = request();

		await expect(queueRequest(asked)).rejects.toThrow(/YouTube asked/);
		expect((asked.client as unknown as { logger: { warn: jest.Mock } }).logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("MUSIC_YTDLP_COOKIES"),
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

	it("takes only the first search result", async () => {
		const session = fakeSession({ tracks: [], index: -1, loop: "off" }, false);
		sessionFor.mockReturnValue(session);

		await queueRequest(request());

		expect(session.queue.tracks).toHaveLength(1);
	});

	it("says so when nothing turned up", async () => {
		sessionFor.mockReturnValue(fakeSession({ tracks: [], index: -1, loop: "off" }, false));
		resolveTracks.mockResolvedValue([]);

		await expect(queueRequest(request())).rejects.toThrow(/nothing turned up/i);
	});
});

describe("queueRequest with the owner's choice of sources", () => {
	const { MusicProblemError } = jest.requireActual<typeof Source>("@lib/music/musicSource.util");
	const botCheck = (): Error => new MusicProblemError({ kind: "bot-check", advice: "YouTube asked." });
	const askedFor = (call: number): { source: string } => resolveTracks.mock.calls[call]?.[0] as { source: string };

	beforeEach(() => {
		sessionFor.mockReturnValue(fakeSession({ tracks: [], index: -1, loop: "off" }, false));
	});

	/** The point of "both": a host YouTube has flagged still plays what was asked for. */
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

	it("tries SoundCloud when YouTube finds nothing", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "both" });
		resolveTracks.mockResolvedValueOnce([]).mockResolvedValueOnce([track("found")]);

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

	it("does not fall back, or suggest SoundCloud, when the owner has switched it off", async () => {
		resolveTracks.mockRejectedValue(botCheck());

		await expect(queueRequest(request())).rejects.toThrow(/^YouTube asked\.$/);
		expect(resolveTracks).toHaveBeenCalledTimes(1);
	});

	it("does not fall back from a video that is simply unavailable", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "both" });
		resolveTracks.mockRejectedValue(new MusicProblemError({ kind: "unavailable", advice: "Gone." }));

		await expect(queueRequest(request())).rejects.toThrow(/Gone/);
		expect(resolveTracks).toHaveBeenCalledTimes(1);
	});

	it("searches SoundCloud alone when the owner chose it", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "soundcloud" });

		await queueRequest(request());

		expect(askedFor(0).source).toBe("soundcloud");
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
	/** With cookies already given, "add cookies" is no help: they have been rotated, and only a fresh export fixes it. */
	it("tells a host with cookies to export fresh ones from a private window", () => {
		expect(hostAdvice("session", true)).toMatch(/private window/);
		expect(hostAdvice("session", false)).toMatch(/npm run music:setup/);
	});

	it("keeps the bot check's advice", () => {
		expect(hostAdvice("bot-check", false)).toContain("MUSIC_YTDLP_COOKIES");
		expect(hostAdvice("bot-check", true)).toMatch(/expired/);
	});

	it("says nothing for a refusal that is about the track", () => {
		expect(hostAdvice("unavailable", true)).toBeNull();
		expect(hostAdvice("drm", false)).toBeNull();
	});
});
