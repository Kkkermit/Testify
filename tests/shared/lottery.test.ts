import { LOTTERY_LIMITS, lotteryBlocked, lotteryPatch } from "@testify/shared";

const CHANNEL = "400000000000000001";

describe("lotteryPatch", () => {
	it("takes each field on its own", () => {
		expect(lotteryPatch.safeParse({ frozen: true }).success).toBe(true);
		expect(lotteryPatch.safeParse({}).success).toBe(true);
	});

	/** The number arrives from a form as a string, so it has to coerce rather than refuse. */
	it("takes a number that arrived as text", () => {
		expect(lotteryPatch.parse({ entryFee: "250" }).entryFee).toBe(250);
	});

	it("refuses a free ticket, which would make the pot unfundable", () => {
		expect(lotteryPatch.safeParse({ entryFee: 0 }).success).toBe(false);
	});

	it("holds the winners inside what a draw can pay", () => {
		expect(lotteryPatch.safeParse({ maxWinners: 0 }).success).toBe(false);
		expect(lotteryPatch.safeParse({ maxWinners: LOTTERY_LIMITS.maxWinners + 1 }).success).toBe(false);
		expect(lotteryPatch.safeParse({ maxWinners: LOTTERY_LIMITS.maxWinners }).success).toBe(true);
	});

	it("allows a starting pot of nothing but not a negative one", () => {
		expect(lotteryPatch.safeParse({ basePrizePool: 0 }).success).toBe(true);
		expect(lotteryPatch.safeParse({ basePrizePool: -1 }).success).toBe(false);
	});

	it("refuses a frequency the draw job does not know", () => {
		expect(lotteryPatch.safeParse({ frequency: "fortnightly" }).success).toBe(false);
		expect(lotteryPatch.safeParse({ frequency: "daily" }).success).toBe(true);
	});

	it("refuses a channel that is not a snowflake", () => {
		expect(lotteryPatch.safeParse({ announcementChannelId: "nope" }).success).toBe(false);
	});

	it("refuses a fractional ticket price", () => {
		expect(lotteryPatch.safeParse({ entryFee: 2.5 }).success).toBe(false);
	});
});

describe("lotteryBlocked", () => {
	it("says nothing once a channel and a price are set", () => {
		expect(lotteryBlocked({ announcementChannelId: CHANNEL, entryFee: 100 })).toBeNull();
	});

	/** The draw posts its winners publicly, so a lottery with nowhere to announce cannot run. */
	it("asks for the announcement channel first", () => {
		expect(lotteryBlocked({ announcementChannelId: null, entryFee: 100 })).toMatch(/announced/i);
	});

	it("asks for a ticket price above nothing", () => {
		expect(lotteryBlocked({ announcementChannelId: CHANNEL, entryFee: 0 })).toMatch(/at least/i);
	});
});
