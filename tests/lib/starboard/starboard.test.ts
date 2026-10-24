import { ButtonStyle, Collection, DiscordAPIError, type Guild, RESTJSONErrorCodes } from "discord.js";
import { parseCustomId } from "@core/button";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	claimStarPost,
	deleteStarPost,
	findStarPost,
	findStarPostByBoardMessage,
	getStarboardSettings,
	markStarPostRemoved,
	recordStars,
	saveStarboardSettings,
	setBoardMessage,
	type StoredStarPost,
} from "@database/repositories/starboardRepository";
import {
	applyStarboardSettings,
	handleStarChange,
	handleStarredDelete,
	parseThreshold,
} from "@lib/starboard/starboardActions.util";
import { starboardPost, starboardSettingsPanel, starsFrom } from "@lib/starboard/starboardPanel.util";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

jest.mock("@database/repositories/starboardRepository", () => ({
	claimStarPost: jest.fn(),
	countStarPosts: jest.fn(() => Promise.resolve(0)),
	deleteStarPost: jest.fn(() => Promise.resolve(null)),
	findStarPost: jest.fn(() => Promise.resolve(null)),
	findStarPostByBoardMessage: jest.fn(() => Promise.resolve(null)),
	getStarboardSettings: jest.fn(),
	markStarPostRemoved: jest.fn(() => Promise.resolve()),
	recordStars: jest.fn(),
	saveStarboardSettings: jest.fn(() => Promise.resolve({})),
	setBoardMessage: jest.fn(() => Promise.resolve()),
}));
jest.mock("@lib/discord/channels.util", () => ({
	canPostIn: jest.fn((_guild: unknown, id: string) => id === "400000000000000009"),
}));

const GUILD = "900000000000000001";
const SOURCE = "400000000000000001";
const BOARD = "400000000000000009";
const MESSAGE = "500000000000000001";
const REPOST = "600000000000000001";
const AUTHOR = "100000000000000001";
const OWNER = "100000000000000009";

const settings = (overrides: object = {}) => ({
	enabled: true,
	channelId: BOARD,
	threshold: 3,
	selfStar: false,
	...overrides,
});
const voter = (id: string, bot = false) => ({ id, bot });
const post = (overrides: Partial<StoredStarPost> = {}): StoredStarPost => ({
	guildId: GUILD,
	messageId: MESSAGE,
	channelId: SOURCE,
	authorId: AUTHOR,
	boardChannelId: BOARD,
	boardMessageId: REPOST,
	stars: 3,
	removed: false,
	...overrides,
});

const unknownMessage = (): DiscordAPIError =>
	new DiscordAPIError(
		{ code: RESTJSONErrorCodes.UnknownMessage, message: "Unknown Message" },
		RESTJSONErrorCodes.UnknownMessage,
		404,
		"PATCH",
		"/channels/x/messages/y",
		{ body: undefined, files: undefined },
	);

function world(options: { boardSendable?: boolean; boardNsfw?: boolean } = {}) {
	const sent = { id: REPOST, edit: jest.fn(() => Promise.resolve()) };
	const board = {
		id: BOARD,
		nsfw: options.boardNsfw ?? false,
		isSendable: () => options.boardSendable ?? true,
		isTextBased: () => true,
		send: jest.fn(() => Promise.resolve(sent)),
		messages: { edit: jest.fn(() => Promise.resolve()), delete: jest.fn(() => Promise.resolve()) },
	};
	const guild = {
		id: GUILD,
		channels: { fetch: jest.fn((id: string) => Promise.resolve(id === BOARD ? board : null)) },
	};
	return { guild, board, sent };
}

function reaction(
	guild: object,
	options: {
		emoji?: string;
		count?: number;
		voters?: { id: string; bot: boolean }[];
		channelId?: string;
		nsfw?: boolean;
	} = {},
) {
	const voters = options.voters ?? [voter("a"), voter("b"), voter("c")];
	const message = {
		id: MESSAGE,
		guild,
		guildId: GUILD,
		channelId: options.channelId ?? SOURCE,
		channel: { name: "general", nsfw: options.nsfw ?? false },
		author: { id: AUTHOR, username: "alice", displayAvatarURL: () => "https://cdn.example/avatar.png" },
		member: { displayName: "Alice" },
		content: "Hello @everyone",
		attachments: new Collection(),
		embeds: [],
		system: false,
		partial: false,
		inGuild: () => true,
	};
	return {
		emoji: { name: options.emoji ?? "⭐" },
		count: options.count ?? voters.length,
		partial: false,
		message,
		users: { fetch: jest.fn(() => Promise.resolve(new Collection(voters.map((entry) => [entry.id, entry])))) },
	};
}

const client = (paused = false) => ({ paused }) as unknown as TestifyClient;

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getStarboardSettings).mockResolvedValue(settings());
	jest.mocked(findStarPost).mockResolvedValue(null);
	jest.mocked(deleteStarPost).mockResolvedValue(null);
	jest.mocked(findStarPostByBoardMessage).mockResolvedValue(null);
	jest
		.mocked(claimStarPost)
		.mockImplementation((fields) =>
			Promise.resolve({ post: post({ ...fields, boardChannelId: null, boardMessageId: null }), created: true }),
		);
	jest.mocked(recordStars).mockImplementation((_guild, _message, stars) => Promise.resolve(post({ stars })));
});

describe("starsFrom", () => {
	it("counts people, never bots, and the author only when the server allows it", () => {
		const voters = [voter(AUTHOR), voter("a"), voter("bot", true)];

		expect(starsFrom(voters, AUTHOR, false)).toBe(1);
		expect(starsFrom(voters, AUTHOR, true)).toBe(2);
	});
});

describe("starboardPost", () => {
	const message = {
		guildId: GUILD,
		channelId: SOURCE,
		channelName: "general",
		messageId: MESSAGE,
		authorName: "Alice",
		authorAvatar: null,
		content: "Hello @everyone",
		imageUrl: "https://cdn.example/cat.png",
	};

	/** The repost carries whatever the author typed, so it must never ping anybody. */
	it("pings nobody, says the count, and links back", () => {
		const sent = starboardPost(message, 5);

		expect(sent.allowedMentions).toEqual({ parse: [] });
		expect(sent.content).toBe(`⭐ **5** · <#${SOURCE}>`);
		expect(JSON.stringify(sent.components)).toContain(`https://discord.com/channels/${GUILD}/${SOURCE}/${MESSAGE}`);
		expect(JSON.stringify(sent.embeds)).toContain("cat.png");
	});

	it("leaves the text out when there is none", () => {
		const sent = starboardPost({ ...message, content: "", imageUrl: null }, 3);

		expect(JSON.stringify(sent.embeds)).not.toContain('"description"');
	});
});

describe("starboardSettingsPanel", () => {
	it("puts the person who opened it last in every control, and offers nothing to turn on with no channel", () => {
		const panel = starboardSettingsPanel(
			{ ...settings({ channelId: null, enabled: false }), canSend: false, posts: 0 },
			OWNER,
		);

		for (const id of idsOf(panel)) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		const toggle = buttonsOf(panel).find((entry) => entry.label === "Turn on");
		expect(toggle?.disabled).toBe(true);
		expect(toggle?.style).toBe(ButtonStyle.Success);
	});

	it("warns when the bot cannot post where the board is", () => {
		expect(textOf(starboardSettingsPanel({ ...settings(), canSend: false, posts: 2 }, OWNER))).toContain(
			"I cannot post there",
		);
	});
});

describe("applyStarboardSettings", () => {
	const guild = { id: GUILD } as unknown as Guild;

	it("will not turn on with nowhere to post", async () => {
		jest.mocked(getStarboardSettings).mockResolvedValue(null);

		await expect(applyStarboardSettings(guild, { enabled: true }, OWNER)).rejects.toThrow(UserFacingError);
		expect(saveStarboardSettings).not.toHaveBeenCalled();
	});

	it("refuses a channel the bot cannot post in", async () => {
		await expect(applyStarboardSettings(guild, { channelId: "400000000000000002" }, OWNER)).rejects.toThrow(
			/cannot post in that channel/,
		);
	});

	it("turns the board off when its channel is cleared", async () => {
		await applyStarboardSettings(guild, { channelId: null }, OWNER);

		expect(saveStarboardSettings).toHaveBeenCalledWith(
			GUILD,
			expect.objectContaining({ enabled: false, channelId: null }),
			OWNER,
		);
	});
});

describe("parseThreshold", () => {
	it("takes a whole number in range and refuses anything else in words", () => {
		expect(parseThreshold(" 5 ")).toBe(5);
		for (const bad of ["0", "51", "2.5", "lots", ""]) expect(() => parseThreshold(bad)).toThrow(UserFacingError);
	});
});

describe("handleStarChange", () => {
	it("ignores any other emoji, and anything while the bot is paused, before a single query", async () => {
		const { guild } = world();

		await handleStarChange(client(), reaction(guild, { emoji: "🔥" }) as never);
		await handleStarChange(client(true), reaction(guild) as never);

		expect(getStarboardSettings).not.toHaveBeenCalled();
	});

	it("does nothing while the board is off", async () => {
		const { guild, board } = world();
		jest.mocked(getStarboardSettings).mockResolvedValue(settings({ enabled: false }));

		await handleStarChange(client(), reaction(guild) as never);

		expect(board.send).not.toHaveBeenCalled();
	});

	/** Starring the board would repost the board to itself. */
	it("ignores stars on the board itself", async () => {
		const { guild, board } = world();

		await handleStarChange(client(), reaction(guild, { channelId: BOARD }) as never);

		expect(board.send).not.toHaveBeenCalled();
	});

	it("does not even fetch the voters while short of the line with nothing posted", async () => {
		const { guild } = world();
		const short = reaction(guild, { voters: [voter("a")] });

		await handleStarChange(client(), short as never);

		expect(short.users.fetch).not.toHaveBeenCalled();
		expect(claimStarPost).not.toHaveBeenCalled();
	});

	it("reposts once it reaches the line, pinging nobody, and remembers where", async () => {
		const { guild, board } = world();

		await handleStarChange(client(), reaction(guild) as never);

		expect(board.send).toHaveBeenCalledTimes(1);
		expect(board.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
		expect(setBoardMessage).toHaveBeenCalledWith(GUILD, MESSAGE, { channelId: BOARD, messageId: REPOST });
	});

	it("does not count the author's own star unless the server says so", async () => {
		const { guild, board } = world();
		const withAuthor = { voters: [voter(AUTHOR), voter("a"), voter("b")] };

		await handleStarChange(client(), reaction(guild, withAuthor) as never);
		expect(board.send).not.toHaveBeenCalled();

		jest.mocked(getStarboardSettings).mockResolvedValue(settings({ selfStar: true }));
		await handleStarChange(client(), reaction(guild, withAuthor) as never);
		expect(board.send).toHaveBeenCalledTimes(1);
	});

	it("moves the count on a repost that is already up", async () => {
		const { guild, board } = world();
		jest.mocked(findStarPost).mockResolvedValue(post());

		await handleStarChange(
			client(),
			reaction(guild, { voters: [voter("a"), voter("b"), voter("c"), voter("d")] }) as never,
		);

		expect(board.send).not.toHaveBeenCalled();
		expect(board.messages.edit).toHaveBeenCalledWith(REPOST, { content: `⭐ **4** · <#${SOURCE}>` });
	});

	/** A repost a moderator deleted stays off the board, however many stars follow. */
	it("never reposts one a moderator took down", async () => {
		const { guild, board } = world();
		jest.mocked(findStarPost).mockResolvedValue(post({ removed: true, boardMessageId: null }));

		await handleStarChange(client(), reaction(guild) as never);

		expect(board.send).not.toHaveBeenCalled();
		expect(board.messages.edit).not.toHaveBeenCalled();
	});

	it("notices a repost deleted while the bot was not looking", async () => {
		const { guild, board } = world();
		jest.mocked(findStarPost).mockResolvedValue(post());
		board.messages.edit.mockRejectedValueOnce(unknownMessage());

		await handleStarChange(client(), reaction(guild) as never);

		expect(markStarPostRemoved).toHaveBeenCalledWith(GUILD, MESSAGE);
	});

	it("only updates the count when another star claimed the post first", async () => {
		const { guild, board } = world();
		jest.mocked(claimStarPost).mockResolvedValue({ post: post(), created: false });

		await handleStarChange(client(), reaction(guild) as never);

		expect(board.send).not.toHaveBeenCalled();
		expect(recordStars).toHaveBeenCalledWith(GUILD, MESSAGE, 3);
	});

	it("lets go of the claim when it cannot post, so the message can still make it later", async () => {
		const { guild, board } = world({ boardSendable: false });

		await handleStarChange(client(), reaction(guild) as never);

		expect(board.send).not.toHaveBeenCalled();
		expect(deleteStarPost).toHaveBeenCalledWith(GUILD, MESSAGE);
	});

	it("keeps an age-restricted channel's messages off a board that is not one", async () => {
		const { guild, board } = world();

		await handleStarChange(client(), reaction(guild, { nsfw: true }) as never);
		expect(board.send).not.toHaveBeenCalled();

		const restricted = world({ boardNsfw: true });
		await handleStarChange(client(), reaction(restricted.guild, { nsfw: true }) as never);
		expect(restricted.board.send).toHaveBeenCalledTimes(1);
	});

	it("catches up with a star that landed while it was posting", async () => {
		const { guild, sent } = world();
		jest
			.mocked(findStarPost)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(post({ stars: 5 }));

		await handleStarChange(client(), reaction(guild) as never);

		expect(sent.edit).toHaveBeenCalledWith({ content: `⭐ **5** · <#${SOURCE}>` });
	});
});

describe("handleStarredDelete", () => {
	/** Somebody who deletes their message has taken it back, so the board takes its copy down too. */
	it("takes the repost down with the original", async () => {
		const { guild, board } = world();
		jest.mocked(deleteStarPost).mockResolvedValue(post());

		await handleStarredDelete(guild as unknown as Guild, MESSAGE);

		expect(board.messages.delete).toHaveBeenCalledWith(REPOST);
	});

	it("remembers a repost deleted from the board", async () => {
		const { guild } = world();
		jest.mocked(findStarPostByBoardMessage).mockResolvedValue(post());

		await handleStarredDelete(guild as unknown as Guild, REPOST);

		expect(markStarPostRemoved).toHaveBeenCalledWith(GUILD, MESSAGE);
	});
});
