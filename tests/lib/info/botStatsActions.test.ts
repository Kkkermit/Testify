import { UserFacingError } from "@core/errors";
import { getFixedStats, removeFixedStats, setFixedStats } from "@database/repositories/settingsRepository";
import { postBotStats, readBotStats, removeBotStats } from "@lib/info/botStatsActions.util";

jest.mock("@database/repositories/settingsRepository", () => ({
	getFixedStats: jest.fn(() => Promise.resolve(null)),
	removeFixedStats: jest.fn(() => Promise.resolve(true)),
	setFixedStats: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@lib/info/statsEmbed.util", () => ({ botStatsEmbed: () => ({ title: "stats" }) }));

const GUILD = "900000000000000001";
const OLD_CHANNEL = "400000000000000001";
const NEW_CHANNEL = "400000000000000002";
const USER = "100000000000000001";

const stored = jest.mocked(getFixedStats);
const saved = jest.mocked(setFixedStats);
const cleared = jest.mocked(removeFixedStats);

function textChannel(id: string, sendable = true) {
	return {
		id,
		isTextBased: () => true,
		isSendable: () => sendable,
		send: jest.fn(() => Promise.resolve({ id: "new-message" })),
		messages: { delete: jest.fn(() => Promise.resolve()) },
	};
}

function world(channels: Record<string, ReturnType<typeof textChannel>>) {
	const lookup = (id: string) => Promise.resolve(channels[id] ?? null);
	const client = { channels: { fetch: jest.fn(lookup) } };
	const guild = { id: GUILD, channels: { fetch: jest.fn(lookup) } };

	return { client: client as never, guild: guild as never };
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
});

describe("readBotStats", () => {
	it("answers null when nothing is posted", async () => {
		await expect(readBotStats(GUILD)).resolves.toEqual({ channelId: null });
	});

	it("names the channel the message is in", async () => {
		stored.mockResolvedValue({ channelId: OLD_CHANNEL, messageId: "m" } as never);

		await expect(readBotStats(GUILD)).resolves.toEqual({ channelId: OLD_CHANNEL });
	});
});

describe("postBotStats", () => {
	it("posts in the channel and remembers the message", async () => {
		const channel = textChannel(NEW_CHANNEL);
		const { client, guild } = world({ [NEW_CHANNEL]: channel });

		await expect(postBotStats(client, guild, NEW_CHANNEL, USER)).resolves.toEqual({ channelId: NEW_CHANNEL });
		expect(channel.send).toHaveBeenCalledTimes(1);
		expect(saved).toHaveBeenCalledWith(GUILD, NEW_CHANNEL, "new-message", USER);
	});

	/** A server keeps one statistics message, so moving it takes the old one down. */
	it("takes down the message it replaces", async () => {
		const before = textChannel(OLD_CHANNEL);
		const after = textChannel(NEW_CHANNEL);
		stored.mockResolvedValue({ channelId: OLD_CHANNEL, messageId: "old-message" } as never);
		const { client, guild } = world({ [OLD_CHANNEL]: before, [NEW_CHANNEL]: after });

		await postBotStats(client, guild, NEW_CHANNEL, USER);

		expect(before.messages.delete).toHaveBeenCalledWith("old-message");
	});

	/** Sending first means a refused send leaves the server with the message it already had. */
	it("keeps the old message when the new one cannot be sent", async () => {
		const before = textChannel(OLD_CHANNEL);
		const after = textChannel(NEW_CHANNEL);
		after.send.mockRejectedValue(new Error("Missing Access"));
		stored.mockResolvedValue({ channelId: OLD_CHANNEL, messageId: "old-message" } as never);
		const { client, guild } = world({ [OLD_CHANNEL]: before, [NEW_CHANNEL]: after });

		await expect(postBotStats(client, guild, NEW_CHANNEL, USER)).rejects.toThrow("Missing Access");
		expect(before.messages.delete).not.toHaveBeenCalled();
		expect(saved).not.toHaveBeenCalled();
	});

	/** The guild's own channel manager is what refuses a channel in somebody else's server. */
	it("refuses a channel this server does not have", async () => {
		const { client, guild } = world({});

		await expect(postBotStats(client, guild, NEW_CHANNEL, USER)).rejects.toBeInstanceOf(UserFacingError);
		expect(saved).not.toHaveBeenCalled();
	});

	it("refuses a channel the bot cannot send in", async () => {
		const { client, guild } = world({ [NEW_CHANNEL]: textChannel(NEW_CHANNEL, false) });

		await expect(postBotStats(client, guild, NEW_CHANNEL, USER)).rejects.toThrow(/send messages/);
	});
});

describe("removeBotStats", () => {
	it("says so when there is nothing to remove", async () => {
		await expect(removeBotStats(world({}).client, GUILD)).resolves.toBe(false);
		expect(cleared).not.toHaveBeenCalled();
	});

	it("deletes the message and forgets it", async () => {
		const channel = textChannel(OLD_CHANNEL);
		stored.mockResolvedValue({ channelId: OLD_CHANNEL, messageId: "old-message" } as never);

		await expect(removeBotStats(world({ [OLD_CHANNEL]: channel }).client, GUILD)).resolves.toBe(true);
		expect(channel.messages.delete).toHaveBeenCalledWith("old-message");
		expect(cleared).toHaveBeenCalledWith(GUILD);
	});

	/** A channel deleted since leaves a record nothing else would ever clear. */
	it("forgets the message even when its channel is gone", async () => {
		stored.mockResolvedValue({ channelId: OLD_CHANNEL, messageId: "old-message" } as never);

		await expect(removeBotStats(world({}).client, GUILD)).resolves.toBe(true);
		expect(cleared).toHaveBeenCalledWith(GUILD);
	});
});
