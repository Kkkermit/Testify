import { type CommandInput } from "@core/command";
import { UserFacingError } from "@core/errors";
import { requireQueue, requireVoice } from "@lib/musicGuards.util";
import { BOT_ID, createMockGuild, createMockInteraction, createMockMember, USER_ID } from "@tests/helpers/mocks";

const getQueue = jest.fn();

jest.mock("@lib/music.util", () => ({ music: jest.fn(() => ({ getQueue })) }));

/** A member sitting in `userChannel`, with the bot in `botChannel` (or nowhere). */
function scene(userChannel: string | null, botChannel: string | null): CommandInput {
	const guild = createMockGuild({
		members: {
			me: botChannel === null ? { voice: { channel: null } } : { voice: { channel: { id: botChannel } } },
		},
	} as never);

	const member = createMockMember({
		id: USER_ID,
		guild,
		voice: { channel: userChannel === null ? null : { id: userChannel, name: "General" } },
	} as never);

	return createMockInteraction({
		overrides: { guild, member, client: { user: { id: BOT_ID } } } as never,
	});
}

beforeEach(() => getQueue.mockReset());

describe("requireVoice", () => {
	it("returns the session when the user is in a channel and the bot is elsewhere unoccupied", () => {
		const session = requireVoice(scene("vc1", null), {} as never);

		expect(session.voiceChannel.id).toBe("vc1");
		expect(session.guildId).toBeDefined();
	});

	it("allows it when the bot is already in the same channel", () => {
		expect(() => requireVoice(scene("vc1", "vc1"), {} as never)).not.toThrow();
	});

	it("refuses when the user is not in a voice channel at all", () => {
		expect(() => requireVoice(scene(null, null), {} as never)).toThrow(UserFacingError);
	});

	/** Otherwise one person can hijack playback from another room. */
	it("refuses when the bot is busy in a different channel", () => {
		expect(() => requireVoice(scene("vc1", "vc2"), {} as never)).toThrow(UserFacingError);
	});
});

describe("requireQueue", () => {
	it("returns the queue when something is playing", () => {
		const queue = { songs: [{ name: "a" }] };
		getQueue.mockReturnValue(queue);

		expect(requireQueue(scene("vc1", "vc1"), {} as never).queue).toBe(queue);
	});

	it("refuses when nothing is playing", () => {
		getQueue.mockReturnValue(undefined);

		expect(() => requireQueue(scene("vc1", "vc1"), {} as never)).toThrow(UserFacingError);
	});

	/** The voice checks still have to run first, or the error names the wrong problem. */
	it("refuses on the voice check before it ever looks at the queue", () => {
		getQueue.mockReturnValue({ songs: [] });

		expect(() => requireQueue(scene(null, null), {} as never)).toThrow(UserFacingError);
		expect(getQueue).not.toHaveBeenCalled();
	});
});
