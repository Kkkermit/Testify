import { DAY_MS, WEEK_MS } from "@config/constants";
import { getLottery, saveLottery } from "@database/repositories/lotteryRepository";
import { applyLottery, normaliseLottery, readLottery } from "@lib/lotteryActions.util";

jest.mock("@database/repositories/lotteryRepository", () => {
	const actual = jest.requireActual("@database/repositories/lotteryRepository");
	return {
		intervalFor: actual.intervalFor,
		getLottery: jest.fn(() => Promise.resolve(null)),
		saveLottery: jest.fn(() => Promise.resolve({})),
	};
});

const GUILD = "900000000000000001";
const ACTOR = "100000000000000001";
const CHANNEL = "400000000000000001";

const stored = jest.mocked(getLottery);
const saved = jest.mocked(saveLottery);

/** Every stored lottery carries these; `nextDrawTime` is required with no default, so it is never absent. */
function record(overrides: Record<string, unknown> = {}): never {
	return {
		guildId: GUILD,
		isActive: true,
		isFrozen: false,
		entryFee: 100,
		prizePool: 2_500,
		basePrizePool: 500,
		maxWinners: 2,
		frequency: "weekly",
		nextDrawTime: new Date("2026-08-14T12:00:00.000Z"),
		announcementChannelId: CHANNEL,
		createdBy: ACTOR,
		lastModifiedBy: ACTOR,
		entries: [
			{ userId: "1", userTag: "kate", tickets: 12, enteredAt: new Date() },
			{ userId: "2", userTag: "sam", tickets: 8, enteredAt: new Date() },
		],
		history: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as never;
}

function running(overrides: Record<string, unknown> = {}): void {
	stored.mockResolvedValue(record(overrides));
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
});

describe("normaliseLottery", () => {
	it("gives a form something to render before a lottery exists", () => {
		expect(normaliseLottery(null)).toMatchObject({ enabled: false, announcementChannelId: null, prizePool: 0 });
	});

	it("adds the tickets up rather than counting entrants", () => {
		running();

		expect(normaliseLottery(record({ entries: [{ tickets: 3 }, { tickets: 4 }] }))).toMatchObject({
			ticketsSold: 7,
			entrants: 2,
		});
	});

	/** The page shows the last few draws; an unbounded history would grow the response without limit. */
	it("keeps only the most recent draws, newest first", () => {
		const history = Array.from({ length: 8 }, (_, i) => ({
			drawTime: new Date(Date.UTC(2026, 0, i + 1)),
			totalPrizePool: i,
			totalTickets: i,
			winners: [],
		}));

		const summary = normaliseLottery(record({ entries: [], history }));

		expect(summary.history).toHaveLength(5);
		expect(summary.history[0]?.prizePool).toBe(7);
	});
});

describe("readLottery", () => {
	it("reports the live pot and the tickets behind it", async () => {
		running();

		await expect(readLottery(GUILD)).resolves.toMatchObject({ prizePool: 2_500, ticketsSold: 20, entrants: 2 });
	});
});

describe("applyLottery", () => {
	it("refuses before a channel is chosen", async () => {
		const result = await applyLottery(GUILD, { entryFee: 100 }, ACTOR);

		expect(result).toEqual({ problem: expect.stringMatching(/announced/i) });
		expect(saved).not.toHaveBeenCalled();
	});

	it("keeps the fields the patch did not mention", async () => {
		running();

		await applyLottery(GUILD, { entryFee: 250 }, ACTOR);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ entryFee: 250, maxWinners: 2 }));
	});

	/**
	 * The stored time was computed from the old interval, so leaving it would have a weekly lottery drawing in
	 * an hour — or an hourly one waiting a week.
	 */
	it("moves the next draw when the frequency changes", async () => {
		running();
		const before = Date.now();

		await applyLottery(GUILD, { frequency: "daily" }, ACTOR);

		const [, fields] = saved.mock.calls[0] as [string, { nextDrawTime: Date }];
		expect(fields.nextDrawTime.getTime()).toBeGreaterThanOrEqual(before + DAY_MS);
		expect(fields.nextDrawTime.getTime()).toBeLessThan(before + DAY_MS + 5_000);
	});

	it("leaves the next draw alone when the frequency does not change", async () => {
		running();

		await applyLottery(GUILD, { entryFee: 250 }, ACTOR);

		const [, fields] = saved.mock.calls[0] as [string, { nextDrawTime: Date }];
		expect(fields.nextDrawTime.toISOString()).toBe("2026-08-14T12:00:00.000Z");
	});

	/** A first save has no stored time to keep, so one has to be computed or the draw job never fires. */
	it("schedules the first draw when the lottery is being created", async () => {
		const before = Date.now();

		await applyLottery(GUILD, { announcementChannelId: CHANNEL, entryFee: 100 }, ACTOR);

		const [, fields] = saved.mock.calls[0] as [string, { nextDrawTime: Date }];
		expect(fields.nextDrawTime.getTime()).toBeGreaterThanOrEqual(before + WEEK_MS);
	});

	it("turns it on, so saving a configuration is what starts it", async () => {
		await applyLottery(GUILD, { announcementChannelId: CHANNEL, entryFee: 100 }, ACTOR);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ isActive: true, lastModifiedBy: ACTOR }));
	});

	it("freezes without disturbing anything else", async () => {
		running();

		await applyLottery(GUILD, { frozen: true }, ACTOR);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ isFrozen: true, entryFee: 100 }));
	});
});
