import { limitsOf } from "@/features/casino/casino.utils";

describe("the casino's rules on the page", () => {
	it("reads an empty ceiling as none, and refuses anything that is not a whole bet", () => {
		expect(limitsOf({ min: "10", max: "" })).toEqual({ minBet: 10, maxBet: null });
		expect(limitsOf({ min: "10", max: "20" })).toEqual({ minBet: 10, maxBet: 20 });
		expect(limitsOf({ min: "0", max: "" })).toBeNull();
		expect(limitsOf({ min: "1.5", max: "" })).toBeNull();
		expect(limitsOf({ min: "10", max: "x" })).toBeNull();
	});
});
