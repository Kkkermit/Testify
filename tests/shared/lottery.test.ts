import { problemText } from "@lib/format/problemText.util";
import { lotteryBlocked, lotteryPatch } from "@testify/shared";

describe("lotteryPatch", () => {
	/** The number arrives from a form as a string, so it has to coerce rather than refuse. */
	it("takes a number that arrived as text", () => {
		expect(lotteryPatch.parse({ entryFee: "250" }).entryFee).toBe(250);
	});

	it("refuses a free ticket, which would make the pot unfundable", () => {
		expect(lotteryPatch.safeParse({ entryFee: 0 }).success).toBe(false);
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
	/** The draw posts its winners publicly, so a lottery with nowhere to announce cannot run. */
	it("asks for the announcement channel first", () => {
		expect(problemText(lotteryBlocked({ announcementChannelId: null, entryFee: 100 }))).toMatch(/announced/i);
	});
});
