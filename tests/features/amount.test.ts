import { resolveAmount } from "../../src/features/economy/services/amount";

describe("resolveAmount", () => {
	it("parses a plain number", () => {
		expect(resolveAmount("500", 1_000)).toBe(500);
	});

	it("ignores digit separators", () => {
		expect(resolveAmount("1,500", 5_000)).toBe(1_500);
	});

	it("supports all, max, half and percentages", () => {
		expect(resolveAmount("all", 900)).toBe(900);
		expect(resolveAmount("max", 900)).toBe(900);
		expect(resolveAmount("half", 900)).toBe(450);
		expect(resolveAmount("25%", 800)).toBe(200);
	});

	it("rejects zero, negatives and junk", () => {
		expect(() => resolveAmount("0", 100)).toThrow();
		expect(() => resolveAmount("-5", 100)).toThrow();
		expect(() => resolveAmount("lots", 100)).toThrow();
	});

	it("refuses `all` when the balance is empty", () => {
		expect(() => resolveAmount("all", 0)).toThrow();
	});

	it("refuses a percentage that rounds to nothing", () => {
		expect(() => resolveAmount("1%", 10)).toThrow();
	});
});
