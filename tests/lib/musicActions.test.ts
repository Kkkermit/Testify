import { type Guild, type GuildMember } from "discord.js";
import { UserFacingError } from "@core/errors";
import { panelFor, requireSession, sameChannelAs, voiceChannelOf } from "@lib/musicActions.util";
import { type QueueState, type Track } from "@lib/musicQueue.util";
import { destroyAllSessions, type MusicSession, sessionFor } from "@lib/musicSession.util";
import { textOf } from "@tests/helpers/containers";

const LOGGER = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), trace: jest.fn() };
const BINARIES = { ytDlp: "/bin/yt-dlp", ffmpeg: null };
const USER = "100000000000000001";

function member(channelId: string | null): GuildMember {
	return { voice: { channel: channelId === null ? null : { id: channelId }, channelId } } as GuildMember;
}

afterEach(() => {
	destroyAllSessions();
});

describe("voiceChannelOf", () => {
	it("returns the channel the person is in", () => {
		expect(voiceChannelOf(member("chan-1"))).toMatchObject({ id: "chan-1" });
	});

	/** "Nothing happened" is the worst possible answer; the refusal says what to do instead. */
	it("asks somebody in no channel to join one", () => {
		expect(() => voiceChannelOf(member(null))).toThrow(UserFacingError);
		expect(() => voiceChannelOf(member(null))).toThrow(/join a voice channel/i);
	});
});

describe("sameChannelAs", () => {
	function sessionIn(channelId: string | null): MusicSession {
		const session = sessionFor({ id: "guild-1" } as Guild, BINARIES, LOGGER as never);
		Object.defineProperty(session, "channelId", { get: () => channelId, configurable: true });

		return session;
	}

	it("allows somebody in the same channel", () => {
		expect(() => sameChannelAs(sessionIn("chan-1"), member("chan-1"))).not.toThrow();
	});

	/** Otherwise anybody in the server could skip the track a different channel is listening to. */
	it("refuses somebody in a different channel", () => {
		expect(() => sameChannelAs(sessionIn("chan-1"), member("chan-2"))).toThrow(/voice channel/i);
	});

	it("refuses somebody in no channel at all", () => {
		expect(() => sameChannelAs(sessionIn("chan-1"), member(null))).toThrow(UserFacingError);
	});

	it("allows anybody while the bot is not connected yet", () => {
		expect(() => sameChannelAs(sessionIn(null), member(null))).not.toThrow();
	});
});

describe("requireSession", () => {
	it("returns a session that exists", () => {
		const created = sessionFor({ id: "guild-2" } as Guild, BINARIES, LOGGER as never);

		expect(requireSession({ id: "guild-2" } as Guild)).toBe(created);
	});

	it("points at /play when there is nothing to control", () => {
		expect(() => requireSession({ id: "guild-none" } as Guild)).toThrow(/\/play/);
	});
});

describe("panelFor", () => {
	function track(title: string): Track {
		return {
			url: `https://youtu.be/${title}`,
			title,
			author: null,
			durationMs: 180_000,
			thumbnail: null,
			source: "youtube",
			requestedBy: USER,
		};
	}

	it("renders the session's own queue rather than a copy that can drift", () => {
		const session = sessionFor({ id: "guild-3" } as Guild, BINARIES, LOGGER as never);
		const queue: QueueState = { tracks: [track("live-one")], index: 0, loop: "off" };
		session.queue = queue;

		expect(textOf(panelFor(session, USER))).toContain("live-one");
	});

	it("carries a note through to the panel", () => {
		const session = sessionFor({ id: "guild-4" } as Guild, BINARIES, LOGGER as never);

		expect(textOf(panelFor(session, USER, "Skipped."))).toContain("Skipped.");
	});
});
