import { Collection, DiscordAPIError, type Guild, ReactionType, RESTJSONErrorCodes } from "discord.js";
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
	releaseStaleClaim,
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
import { textOf } from "@tests/helpers/containers";

jest.mock("@database/repositories/starboardRepository", () => ({
	claimStarPost: jest.fn(),
	countStarPosts: jest.fn(() => Promise.resolve(0)),
	deleteStarPost: jest.fn(() => Promise.resolve(null)),
	findStarPost: jest.fn(() => Promise.resolve(null)),
	findStarPostByBoardMessage: jest.fn(() => Promise.resolve(null)),
	getStarboardSettings: jest.fn(),
	markStarPostRemoved: jest.fn(() => Promise.resolve()),
	recordStars: jest.fn(),
	releaseStaleClaim: jest.fn(() => Promise.resolve(false)),
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

const discordError = (code: RESTJSONErrorCodes, status: number): DiscordAPIError =>
	new DiscordAPIError({ code, message: "Refused" }, code, status, "POST", "/channels/x/messages", {
		body: undefined,
		files: undefined,
	});

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
		burst?: { id: string; bot: boolean }[];
		channelId?: string;
		nsfw?: boolean;
	} = {},
) {
	const voters = options.voters ?? [voter("a"), voter("b"), voter("c")];
	const burst = options.burst ?? [];
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
		count: options.count ?? voters.length + burst.length,
		partial: false,
		message,
		users: {
			fetch: jest.fn(({ type }: { type?: ReactionType }) =>
				Promise.resolve(
					new Collection((type === ReactionType.Burst ? burst : voters).map((entry) => [entry.id, entry])),
				),
			),
		},
	};
}

const logger = { debug: jest.fn(), warn: jest.fn() };
const client = (paused = false) => ({ paused, logger }) as unknown as TestifyClient;

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
});

describe("starboardSettingsPanel", () => {
	it("warns when the bot cannot post where the board is", () => {
		expect(textOf(starboardSettingsPanel({ ...settings(), canSend: false, posts: 2 }, OWNER))).toContain(
			"I cannot post there",
		);
	});
});

describe("applyStarboardSettings", () => {
	const guild = { id: GUILD } as unknown as Guild;

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
	/** Starring the board would repost the board to itself. */
	it("ignores stars on the board itself", async () => {
		const { guild, board } = world();

		await handleStarChange(client(), reaction(guild, { channelId: BOARD }) as never);

		expect(board.send).not.toHaveBeenCalled();
	});

	it("reposts once it reaches the line, pinging nobody, and remembers where", async () => {
		const { guild, board } = world();

		await handleStarChange(client(), reaction(guild) as never);

		expect(board.send).toHaveBeenCalledTimes(1);
		expect(board.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
		expect(setBoardMessage).toHaveBeenCalledWith(GUILD, MESSAGE, { channelId: BOARD, messageId: REPOST });
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
		board.messages.edit.mockRejectedValueOnce(discordError(RESTJSONErrorCodes.UnknownMessage, 404));

		await handleStarChange(client(), reaction(guild) as never);

		expect(markStarPostRemoved).toHaveBeenCalledWith(GUILD, MESSAGE);
	});

	it("lets go of the claim when it cannot post, so the message can still make it later", async () => {
		const { guild, board } = world({ boardSendable: false });

		await handleStarChange(client(), reaction(guild) as never);

		expect(board.send).not.toHaveBeenCalled();
		expect(deleteStarPost).toHaveBeenCalledWith(GUILD, MESSAGE);
	});

	/** Issue #143: a repost that failed kept its claim, and every later ⭐ on that message did nothing, silently. */
	it("lets go of the claim when the repost is refused, and says which permission to grant", async () => {
		const { guild, board } = world();
		board.send.mockRejectedValueOnce(discordError(RESTJSONErrorCodes.MissingPermissions, 403));

		await handleStarChange(client(), reaction(guild) as never);

		expect(deleteStarPost).toHaveBeenCalledWith(GUILD, MESSAGE);
		expect(setBoardMessage).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Send Messages"));
	});

	it("lets go of the claim before an unexpected failure is reported", async () => {
		const { guild, board } = world();
		board.send.mockRejectedValueOnce(new Error("boom"));

		await expect(handleStarChange(client(), reaction(guild) as never)).rejects.toThrow("boom");
		expect(deleteStarPost).toHaveBeenCalledWith(GUILD, MESSAGE);
	});

	/** Issue #143: a claim left by a run that died held its message off the board for ever. */
	it("reposts a message whose claim never posted, once that claim is stale", async () => {
		const { guild, board } = world();
		jest.mocked(findStarPost).mockResolvedValue(post({ boardChannelId: null, boardMessageId: null }));
		jest.mocked(releaseStaleClaim).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

		await handleStarChange(client(), reaction(guild) as never);
		expect(board.send).not.toHaveBeenCalled();

		await handleStarChange(client(), reaction(guild) as never);
		expect(board.send).toHaveBeenCalledTimes(1);
	});

	/** Discord lists super reactions apart from the rest, so a super ⭐ alone used to count as none. */
	it("counts a super reaction", async () => {
		const { guild, board } = world();
		jest.mocked(getStarboardSettings).mockResolvedValue(settings({ threshold: 1 }));

		await handleStarChange(client(), reaction(guild, { voters: [], burst: [voter("a")] }) as never);

		expect(board.send).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("**1**") }));
	});

	/** Issue #143: every quiet way out says why at debug, so "nothing happened" can be read in the log. */
	it("says why a star did nothing", async () => {
		const { guild } = world();
		jest.mocked(getStarboardSettings).mockResolvedValue(settings({ threshold: 1 }));

		await handleStarChange(client(), reaction(guild, { voters: [voter(AUTHOR)] }) as never);

		expect(logger.debug).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("author's own ⭐"));
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
});
