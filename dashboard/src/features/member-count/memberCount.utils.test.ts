import { shareOf, splitOf } from "@/features/member-count/memberCount.utils";

describe("shareOf", () => {
	/** An empty server would otherwise divide by nothing and draw NaN across the bar. */
	it("reads nothing as 0%", () => {
		expect(shareOf(0, 0)).toBe(0);
	});
});

describe("splitOf", () => {
	/** Rounded separately, 1 in 3 and 2 in 3 would read 33% and 67%, or 33% and 66% — the bar must add up. */
	it("always adds up to 100 when anybody is there", () => {
		expect(splitOf({ people: 2, bots: 1 })).toEqual({ people: 67, bots: 33 });
		expect(splitOf({ people: 1, bots: 2 })).toEqual({ people: 33, bots: 67 });
	});
});
