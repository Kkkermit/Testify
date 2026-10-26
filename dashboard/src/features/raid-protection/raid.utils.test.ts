import { hasWork, numberIn } from "@/features/raid-protection/raid.utils";

describe("numberIn", () => {
	it("reads a whole number inside the bounds and nothing else", () => {
		expect(numberIn(" 7 ", 0, 28)).toBe(7);
		expect(numberIn("0", 0, 28)).toBe(0);
		expect(numberIn("29", 0, 28)).toBeNull();
		expect(numberIn("1.5", 0, 28)).toBeNull();
		expect(numberIn("", 0, 28)).toBeNull();
	});
});

describe("hasWork", () => {
	it("needs a minimum age or an alert channel", () => {
		expect(hasWork({ minAccountAgeDays: 0, alertChannelId: null })).toBe(false);
		expect(hasWork({ minAccountAgeDays: 3, alertChannelId: null })).toBe(true);
		expect(hasWork({ minAccountAgeDays: 0, alertChannelId: "400000000000000001" })).toBe(true);
	});
});
