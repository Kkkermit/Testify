import { type LotteryRecord } from "@database/models/lottery.schema";
import { adjustWallet } from "@database/repositories/economyRepository";
import { claimDueDraw, recordDraw } from "@database/repositories/lotteryRepository";
import { runLotteryDraws } from "@jobs/lotteryDraw.util";
import { createMockChannel, createMockClient, GUILD_ID } from "@tests/helpers/mocks";

jest.mock("@database/repositories/lotteryRepository", () => ({
	claimDueDraw: jest.fn(),
	recordDraw: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/economyRepository", () => ({
	adjustWallet: jest.fn(() => Promise.resolve({})),
}));

const claimed = jest.mocked(claimDueDraw);
const paid = jest.mocked(adjustWallet);
const recorded = jest.mocked(recordDraw);

function lottery(entries: { userId: string; tickets: number }[], maxWinners: number): LotteryRecord {
	return {
		guildId: GUILD_ID,
		isActive: true,
		isFrozen: false,
		entryFee: 10,
		prizePool: 900,
		basePrizePool: 100,
		maxWinners,
		frequency: "daily",
		nextDrawTime: new Date("2026-11-25T12:00:00.000Z"),
		announcementChannelId: "500000000000000005",
		createdBy: "100000000000000001",
		lastModifiedBy: "100000000000000001",
		entries: entries.map((entry) => ({ ...entry, userTag: entry.userId, enteredAt: new Date() })),
		history: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

async function draw(record: LotteryRecord): Promise<ReturnType<typeof createMockChannel>> {
	claimed.mockReset();
	claimed.mockResolvedValueOnce(record).mockResolvedValue(null);
	const channel = createMockChannel();
	await runLotteryDraws(createMockClient({ channels: { fetch: jest.fn(() => Promise.resolve(channel)) } } as never));
	return channel;
}

beforeEach(() => jest.clearAllMocks());

describe("the lottery draw", () => {
	/** One entrant on a three-prize draw was paid a third of the pot, and the other two thirds vanished. */
	it("pays the whole pot when there are fewer entrants than prizes", async () => {
		await draw(lottery([{ userId: "a", tickets: 5 }], 3));

		expect(paid.mock.calls).toEqual([[GUILD_ID, "a", 900]]);
	});

	it("splits the pot between different people and never pays one twice", async () => {
		await draw(
			lottery(
				[
					{ userId: "a", tickets: 50 },
					{ userId: "b", tickets: 1 },
					{ userId: "c", tickets: 1 },
				],
				2,
			),
		);

		const winners = paid.mock.calls.map(([, userId]) => userId);
		expect(new Set(winners).size).toBe(2);
		expect(paid.mock.calls.every(([, , amount]) => amount === 450)).toBe(true);
		expect(recorded).toHaveBeenCalledWith(
			expect.objectContaining({ guildId: GUILD_ID, basePrizePool: 100 }),
			expect.objectContaining({ totalTickets: 52, winners: expect.any(Array) as unknown }),
		);
	});

	it("rolls the pot over when nobody entered, and says when the next draw is", async () => {
		const channel = await draw(lottery([], 1));

		expect(paid).not.toHaveBeenCalled();
		const sent = jest.mocked(channel.send).mock.calls[0]?.[0] as { embeds: { toJSON(): unknown }[] };
		expect(JSON.stringify(sent.embeds[0]?.toJSON())).toContain(
			`<t:${String(Date.parse("2026-11-25T12:00:00.000Z") / 1_000)}:R>`,
		);
	});
});
