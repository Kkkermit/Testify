import { type Guild, type GuildMember } from "discord.js";
import { UserFacingError } from "@core/errors";
import { type QueueState, type Track } from "@lib/music/music.types";
import {
	panelFor,
	requireSession,
	requireVolumeControl,
	sameChannelAs,
	showPanel,
	voiceChannelOf,
} from "@lib/music/musicActions.util";
import { destroyAllSessions, type MusicSession, sessionFor } from "@lib/music/musicSession.util";
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

describe("requireVolumeControl", () => {
	/** Both `/music volume` and the panel's buttons ask this, so the refusal cannot come to be worded twice. */
	it("refuses on a host with no FFmpeg, naming what to run", () => {
		const session = sessionFor({ id: "guild-5" } as Guild, BINARIES, LOGGER as never);

		expect(() => requireVolumeControl(session)).toThrow(UserFacingError);
		expect(() => requireVolumeControl(session)).toThrow(/FFmpeg/);
		expect(() => requireVolumeControl(session)).toThrow(/music:setup/);
	});

	it("allows it on a host that has one", () => {
		const session = sessionFor(
			{ id: "guild-6" } as Guild,
			{ ytDlp: "/bin/yt-dlp", ffmpeg: "/bin/ffmpeg" },
			LOGGER as never,
		);

		expect(() => requireVolumeControl(session)).not.toThrow();
	});
});

describe("showPanel", () => {
	function interaction(overrides: Record<string, unknown> = {}): never {
		return {
			user: { id: USER },
			deferred: false,
			replied: false,
			reply: jest.fn(() => Promise.resolve(undefined)),
			editReply: jest.fn(() => Promise.resolve(undefined)),
			fetchReply: jest.fn(() => Promise.resolve({ id: "message-1" })),
			channel: { id: "chan-1", messages: { edit: jest.fn(() => Promise.resolve(undefined)) } },
			...overrides,
		} as never;
	}

	/**
	 * An interaction token dies after fifteen minutes, which is shorter than plenty of queues — so the live
	 * panel edits the message through the channel rather than through the reply it came from.
	 */
	it("leaves the panel live, editing through the channel", async () => {
		const session = sessionFor({ id: "guild-7" } as Guild, BINARIES, LOGGER as never);
		const input = interaction();

		await showPanel(input, session);
		await session.refreshPanel();

		expect(
			(input as unknown as { channel: { messages: { edit: jest.Mock } } }).channel.messages.edit,
		).toHaveBeenCalledWith("message-1", expect.objectContaining({ components: expect.any(Array) }));
	});

	it("still answers when the reply cannot be found again", async () => {
		const session = sessionFor({ id: "guild-8" } as Guild, BINARIES, LOGGER as never);
		const input = interaction({ fetchReply: jest.fn(() => Promise.reject(new Error("Unknown Message"))) });

		await expect(showPanel(input, session)).resolves.toBeUndefined();
		expect((input as unknown as { reply: jest.Mock }).reply).toHaveBeenCalled();
	});

	it("does not try to follow a panel sent somewhere with no message history", async () => {
		const session = sessionFor({ id: "guild-9" } as Guild, BINARIES, LOGGER as never);
		const input = interaction({ channel: null });

		await expect(showPanel(input, session)).resolves.toBeUndefined();
	});
});
