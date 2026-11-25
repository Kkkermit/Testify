import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { claimExpiredSoftban, retrySoftbanAt } from "@database/repositories/moderationRepository";
import { processExpiredSoftbans } from "@jobs/softbanExpiry.util";
import { createMockClient, GUILD_ID, mockCollection, USER_ID } from "@tests/helpers/mocks";

jest.mock("@database/repositories/moderationRepository", () => ({
	claimExpiredSoftban: jest.fn(),
	retrySoftbanAt: jest.fn(() => Promise.resolve()),
}));

const claimed = jest.mocked(claimExpiredSoftban);
const retried = jest.mocked(retrySoftbanAt);

const softban = {
	guildId: GUILD_ID,
	userId: USER_ID,
	moderatorId: "100000000000000001",
	reason: "Spam",
	expiresAt: new Date("2026-11-20T00:00:00.000Z"),
	isActive: false,
	deleteMessageSeconds: 0,
	createdAt: new Date(),
	updatedAt: new Date(),
};

function discordError(code: number): DiscordAPIError {
	return new DiscordAPIError({ message: "refused", code }, code, 403, "DELETE", "u", {});
}

async function expire(unban: jest.Mock): Promise<void> {
	claimed.mockReset();
	claimed.mockResolvedValueOnce(softban).mockResolvedValue(null);
	const guild = { id: GUILD_ID, bans: { remove: unban } };
	await processExpiredSoftbans(createMockClient({ guilds: { cache: mockCollection([[GUILD_ID, guild]]) } } as never));
}

beforeEach(() => jest.clearAllMocks());

describe("lifting expired softbans", () => {
	/** The claim was the only record of the softban, so an unban Discord refused left the member banned for good. */
	it("hands one Discord refused back to be tried again later", async () => {
		await expire(jest.fn(() => Promise.reject(discordError(RESTJSONErrorCodes.MissingPermissions))));

		expect(retried).toHaveBeenCalledWith(softban, expect.any(Date));
		expect(retried.mock.calls[0]?.[1].getTime()).toBeGreaterThan(Date.now());
	});

	/** A reason Discord refuses as too long would be refused again every ten minutes, so the member stayed banned. */
	it("fits the reason it gives Discord within 512 characters", async () => {
		const unban = jest.fn(() => Promise.resolve());
		claimed.mockReset();
		claimed.mockResolvedValueOnce({ ...softban, reason: "x".repeat(500) }).mockResolvedValue(null);
		const guild = { id: GUILD_ID, bans: { remove: unban } };
		await processExpiredSoftbans(createMockClient({ guilds: { cache: mockCollection([[GUILD_ID, guild]]) } } as never));

		const sent = (unban.mock.calls[0] as unknown as [string, string] | undefined)?.[1] ?? "";
		expect([sent.length > 0, sent.length <= 512]).toEqual([true, true]);
	});

	it("lets one go that was already lifted, or that it lifted", async () => {
		await expire(jest.fn(() => Promise.reject(discordError(RESTJSONErrorCodes.UnknownBan))));
		await expire(jest.fn(() => Promise.resolve()));

		expect(retried).not.toHaveBeenCalled();
	});
});
