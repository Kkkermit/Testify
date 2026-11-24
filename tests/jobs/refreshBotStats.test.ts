import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { listFixedStats, removeFixedStats } from "@database/repositories/botStatsRepository";
import { refreshBotStats } from "@jobs/refreshBotStats.util";
import { createMockClient, GUILD_ID, mockCollection } from "@tests/helpers/mocks";

jest.mock("@database/repositories/botStatsRepository", () => ({
	listFixedStats: jest.fn(),
	removeFixedStats: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@lib/info", () => ({ botStatsEmbed: jest.fn(() => ({})) }));

const removed = jest.mocked(removeFixedStats);

function refreshWith(fetch: jest.Mock, guilds = mockCollection([[GUILD_ID, {}]])): Promise<void> {
	jest
		.mocked(listFixedStats)
		.mockResolvedValue([
			{ guildId: GUILD_ID, channelId: "c", messageId: "m", userId: "u", createdAt: new Date(), updatedAt: new Date() },
		]);
	return refreshBotStats(createMockClient({ channels: { fetch }, guilds: { cache: guilds } } as never));
}

beforeEach(() => jest.clearAllMocks());

describe("refreshing the statistics messages", () => {
	/** Any failed fetch deleted the server's setup, so one Discord outage forgot every statistics message. */
	it("keeps a server's message when Discord fails for a reason that may pass", async () => {
		await refreshWith(jest.fn(() => Promise.reject(new Error("socket hang up"))));

		expect(removed).not.toHaveBeenCalled();
	});

	it("forgets one whose channel or message Discord says is gone", async () => {
		const gone = new DiscordAPIError(
			{ message: "Unknown Channel", code: RESTJSONErrorCodes.UnknownChannel },
			RESTJSONErrorCodes.UnknownChannel,
			404,
			"GET",
			"u",
			{},
		);
		await refreshWith(jest.fn(() => Promise.reject(gone)));

		expect(removed).toHaveBeenCalledWith(GUILD_ID);
	});

	it("asks Discord nothing for a server the bot is no longer in", async () => {
		const fetch = jest.fn();
		await refreshWith(fetch, mockCollection());

		expect(fetch).not.toHaveBeenCalled();
	});

	it("edits the message it finds", async () => {
		const edit = jest.fn(() => Promise.resolve());
		const channel = { isTextBased: () => true, messages: { fetch: jest.fn(() => Promise.resolve({ edit })) } };
		await refreshWith(jest.fn(() => Promise.resolve(channel)));

		expect(edit).toHaveBeenCalledTimes(1);
		expect(removed).not.toHaveBeenCalled();
	});
});
