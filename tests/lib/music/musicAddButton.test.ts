import musicAdd from "@buttons/musicAdd";
import { UserFacingError } from "@core/errors";
import type * as Music from "@lib/music";

jest.mock("@core/checks", () => ({ checkMusicControl: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@lib/music", () => ({
	...jest.requireActual<typeof Music>("@lib/music"),
	queueRequest: jest.fn(),
	findSession: jest.fn(() => null),
}));

const { checkMusicControl } = jest.requireMock("@core/checks");
const { queueRequest } = jest.requireMock("@lib/music");

const USER = "100000000000000002";

function member(channelId: string | null): object {
	return { voice: { channel: channelId === null ? null : { id: channelId }, channelId } };
}

function pressed(inVoice: string | null = "voice-1") {
	return {
		user: { id: USER },
		guild: { id: "guild-1" },
		member: member(inVoice),
		isButton: () => true,
		isModalSubmit: () => false,
		showModal: jest.fn(() => Promise.resolve()),
	};
}

function submitted(query: string) {
	return {
		user: { id: USER },
		guild: { id: "guild-1" },
		channelId: "text-1",
		member: member("voice-1"),
		isButton: () => false,
		isModalSubmit: () => true,
		fields: { getTextInputValue: () => query },
		deferReply: jest.fn(() => Promise.resolve()),
		editReply: jest.fn(() => Promise.resolve()),
	};
}

const context = (action: string) => ({ client: {} as never, action, args: [] });

beforeEach(() => {
	jest.clearAllMocks();
	checkMusicControl.mockResolvedValue(null);
});

describe("the Add to queue button", () => {
	it("opens a form for the song", async () => {
		const interaction = pressed();

		await musicAdd.run(interaction as never, context("open"));

		expect(interaction.showModal).toHaveBeenCalledTimes(1);
	});

	/** It carries no owner, so the music system's switch and DJ roles are the only thing standing in the way. */
	it("refuses somebody the music system would refuse, before any form appears", async () => {
		checkMusicControl.mockResolvedValue("You need a DJ role to use the music commands here.");
		const interaction = pressed();

		await expect(musicAdd.run(interaction as never, context("open"))).rejects.toThrow(/DJ role/);
		expect(interaction.showModal).not.toHaveBeenCalled();
	});

	it("asks somebody outside a voice channel to join one first", async () => {
		const interaction = pressed(null);

		await expect(musicAdd.run(interaction as never, context("open"))).rejects.toBeInstanceOf(UserFacingError);
		expect(interaction.showModal).not.toHaveBeenCalled();
	});
});

describe("submitting the form", () => {
	it("queues the song the way /play does and says what happened", async () => {
		const refreshPanel = jest.fn(() => Promise.resolve());
		queueRequest.mockResolvedValue({ session: { refreshPanel }, note: "Added **Song** to the queue." });
		const interaction = submitted("some song");

		await musicAdd.run(interaction as never, context("submit"));

		expect(queueRequest).toHaveBeenCalledWith(
			expect.objectContaining({ requestedBy: USER, next: false, textChannelId: "text-1" }),
		);
		expect(refreshPanel).toHaveBeenCalled();
		expect(interaction.editReply).toHaveBeenCalledTimes(1);
	});

	/** A form can sit open while somebody changes the roles, so the submit is checked again. */
	it("checks access again on the submit", async () => {
		checkMusicControl.mockResolvedValue("The music system is switched off in this server.");
		const interaction = submitted("some song");

		await expect(musicAdd.run(interaction as never, context("submit"))).rejects.toThrow(/switched off/);
		expect(queueRequest).not.toHaveBeenCalled();
	});

	it("refuses a Spotify link by name rather than playing nothing", async () => {
		const interaction = submitted("https://open.spotify.com/track/abc");

		await expect(musicAdd.run(interaction as never, context("submit"))).rejects.toThrow(/Spotify/);
		expect(interaction.deferReply).not.toHaveBeenCalled();
	});
});
