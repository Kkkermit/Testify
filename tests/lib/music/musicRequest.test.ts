import { type Guild, type VoiceBasedChannel } from "discord.js";
import { UserFacingError } from "@core/errors";
import { type QueueState, type Track } from "@lib/music/music.types";
import { queueRequest, requestedQuery } from "@lib/music/musicActions.util";
import { finished } from "@lib/music/musicQueue.util";
import type * as Source from "@lib/music/musicSource.util";

jest.mock("@lib/music/musicSource.util", () => ({
	MusicProblemError: jest.requireActual<typeof Source>("@lib/music/musicSource.util").MusicProblemError,
	resolveTracks: jest.fn(),
}));
jest.mock("@lib/music/musicBinaries.util", () => ({ findBinaries: () => ({ ytDlp: "/bin/yt-dlp", ffmpeg: null }) }));
jest.mock("@lib/music/musicSession.util", () => ({ sessionFor: jest.fn(), findSession: jest.fn() }));

const { resolveTracks } = jest.requireMock("@lib/music/musicSource.util");
const { sessionFor } = jest.requireMock("@lib/music/musicSession.util");

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

describe("requestedQuery", () => {
	it("refuses Spotify by name, because its streams are DRM-protected", () => {
		expect(() => requestedQuery("https://open.spotify.com/track/abc")).toThrow(/Spotify/);
	});

	it("refuses nothing at all", () => {
		expect(() => requestedQuery("   ")).toThrow(UserFacingError);
	});
});
