import { type Guild, type GuildMember } from "discord.js";
import { UserFacingError } from "@core/errors";
import { type QueueState, type Track } from "@lib/music/music.types";
import {
	requireSession,
	requireVolumeControl,
	sameChannelAs,
	showPanel,
	voiceChannelOf,
} from "@lib/music/musicActions.util";
import { destroyAllSessions, type MusicSession, sessionFor } from "@lib/music/musicSession.util";

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

	/** Otherwise anybody in the server could skip the track a different channel is listening to. */
	it("refuses somebody in a different channel", () => {
		expect(() => sameChannelAs(sessionIn("chan-1"), member("chan-2"))).toThrow(/voice channel/i);
	});

	it("refuses somebody in no channel at all", () => {
		expect(() => sameChannelAs(sessionIn("chan-1"), member(null))).toThrow(UserFacingError);
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

describe("the panel message", () => {
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

	it("renders the session's own queue rather than a copy that can drift", async () => {
		const session = sessionFor({ id: "guild-3" } as Guild, BINARIES, LOGGER as never);
		const queue: QueueState = { tracks: [track("live-one")], index: 0, loop: "off" };
		session.queue = queue;

		expect(JSON.stringify((await session.panelMessage(USER)).payload.components[0]?.toJSON())).toContain("live-one");
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

	/** The live panel edits through the channel, because an interaction token dies after fifteen minutes. */
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
});
