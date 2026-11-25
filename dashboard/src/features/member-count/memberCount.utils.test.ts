import { shareOf, splitOf } from "@/features/member-count/memberCount.utils";

describe("the people and bots split", () => {
	/**
	 * An empty server would otherwise divide by nothing and draw NaN across the bar, and rounded separately 1 in 3 and
	 * 2 in 3 would read 33% and 66%, so the bar must add up.
	 */
	it("reads nothing as 0%, and always adds up to 100 when anybody is there", () => {
		expect(shareOf(0, 0)).toBe(0);
		expect(splitOf({ people: 0, bots: 0 })).toEqual({ people: 0, bots: 0 });
		expect(splitOf({ people: 2, bots: 1 })).toEqual({ people: 67, bots: 33 });
		expect(splitOf({ people: 1, bots: 2 })).toEqual({ people: 33, bots: 67 });
	});
});
