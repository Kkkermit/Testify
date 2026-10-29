import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import {
	createIdea,
	decideIdea,
	deleteIdea,
	getIdeaSettings,
	lastIdeaAt,
	saveIdeaSettings,
	type StoredIdea,
} from "@database/repositories/ideaRepository";
import { applyIdeaSettings, decideOnIdea, submitIdea } from "@lib/ideas/ideaActions.util";

jest.mock("@database/repositories/ideaRepository", () => ({
	countIdeas: jest.fn(() => Promise.resolve({ open: 0, accepted: 0, declined: 0 })),
	createIdea: jest.fn(),
	decideIdea: jest.fn(),
	deleteIdea: jest.fn(() => Promise.resolve(null)),
	getIdeaSettings: jest.fn(),
	lastIdeaAt: jest.fn(() => Promise.resolve(null)),
	saveIdeaSettings: jest.fn(() => Promise.resolve({})),
	setIdeaMessage: jest.fn(() => Promise.resolve()),
	takeIdeaNumber: jest.fn(() => Promise.resolve(7)),
}));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn((_guild: unknown, id: string) => id === "ok") }));

const NOW = new Date("2026-10-23T12:00:00.000Z");
const AUTHOR = { id: "100000000000000002", username: "alice" };
const IDEA: StoredIdea = {
	id: "6650a1b2c3d4e5f6a7b8c9d0",
	guildId: "900000000000000001",
	number: 7,
	channelId: "ok",
	messageId: null,
	authorId: AUTHOR.id,
	authorName: AUTHOR.username,
	text: "A pets channel",
	status: "open",
	reason: "",
	decidedBy: null,
	decidedByName: null,
	decidedAt: null,
	upVoters: [],
	downVoters: [],
	createdAt: NOW,
};

function guildWith(channel: object | null): Guild {
	return {
		id: IDEA.guildId,
		name: "Test Server",
		channels: { fetch: jest.fn(() => Promise.resolve(channel)) },
	} as unknown as Guild;
}

function channel(send = jest.fn(() => Promise.resolve({ id: "500000000000000001" }))) {
	const edit = jest.fn(() => Promise.resolve());
	return {
		send,
		edit,
		isSendable: () => true,
		isTextBased: () => true,
		messages: { fetch: jest.fn(() => Promise.resolve({ edit })), delete: jest.fn(() => Promise.resolve()) },
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getIdeaSettings).mockResolvedValue({ enabled: true, channelId: "ok" });
	jest.mocked(createIdea).mockResolvedValue(IDEA);
	jest.mocked(lastIdeaAt).mockResolvedValue(null);
});

describe("posting an idea", () => {
	/** The author is mentioned in the post, and the idea's own text can mention anybody. */
	it("posts it without pinging anybody, numbered from the counter", async () => {
		const target = channel();

		const posted = await submitIdea(guildWith(target), AUTHOR, "A pets channel", NOW);

		expect(createIdea).toHaveBeenCalledWith(expect.objectContaining({ number: 7, text: "A pets channel" }));
		expect(target.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
		expect(posted.messageId).toBe("500000000000000001");
	});

	it("refuses one while the board is off", async () => {
		jest.mocked(getIdeaSettings).mockResolvedValue({ enabled: false, channelId: "ok" });

		await expect(submitIdea(guildWith(channel()), AUTHOR, "x", NOW)).rejects.toThrow(/no idea board yet/);
		expect(createIdea).not.toHaveBeenCalled();
	});

	/** An idea nobody can see is not one, so a failed post must not leave a record behind it. */
	it("removes the record when the post fails", async () => {
		const target = channel(jest.fn(() => Promise.reject(new Error("Missing Access"))));

		await expect(submitIdea(guildWith(target), AUTHOR, "A pets channel", NOW)).rejects.toThrow(/Missing Access/);
		expect(deleteIdea).toHaveBeenCalledWith(IDEA.guildId, IDEA.id);
	});

	it("refuses an empty idea", async () => {
		await expect(submitIdea(guildWith(channel()), AUTHOR, "\u200b", NOW)).rejects.toThrow(/Say what your idea is/);
	});
});

describe("deciding on an idea", () => {
	function client(send = jest.fn(() => Promise.resolve())): TestifyClient {
		return {
			users: { fetch: jest.fn(() => Promise.resolve({ send })) },
			logger: { debug: jest.fn() },
		} as unknown as TestifyClient;
	}

	it("updates the post and tells its author", async () => {
		const send = jest.fn(() => Promise.resolve());
		const target = channel();
		jest.mocked(decideIdea).mockResolvedValue({ ...IDEA, messageId: "m", status: "accepted", reason: "Yes" });

		await decideOnIdea(
			client(send),
			guildWith(target),
			IDEA.id,
			{ status: "accepted", reason: "Yes" },
			{
				id: "s",
				name: "kate",
			},
		);

		expect(target.edit).toHaveBeenCalledTimes(1);
		expect(send).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("was accepted") }));
	});

	it("still decides when the author's DMs are closed", async () => {
		jest.mocked(decideIdea).mockResolvedValue({ ...IDEA, status: "declined" });

		await expect(
			decideOnIdea(
				client(jest.fn(() => Promise.reject(new Error("closed")))),
				guildWith(channel()),
				IDEA.id,
				{
					status: "declined",
					reason: "",
				},
				{ id: "s", name: "kate" },
			),
		).resolves.toMatchObject({ status: "declined" });
	});
});

describe("the board's settings", () => {
	it("will not turn on without a channel", async () => {
		jest.mocked(getIdeaSettings).mockResolvedValue({ enabled: false, channelId: null });

		await expect(applyIdeaSettings(guildWith(null), { enabled: true }, "1")).rejects.toThrow(/Pick a channel/);
		expect(saveIdeaSettings).not.toHaveBeenCalled();
	});

	it("refuses a channel it cannot post in", async () => {
		await expect(applyIdeaSettings(guildWith(null), { channelId: "locked" }, "1")).rejects.toThrow(/cannot post/);
	});
});
