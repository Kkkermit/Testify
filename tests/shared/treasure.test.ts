import { problemText } from "@lib/format/problemText.util";
import { treasurePatch, treasureProblem } from "@testify/shared";

describe("treasurePatch", () => {
	/** The number arrives from a form as a string, so it has to coerce rather than refuse. */
	it("takes a number that arrived as text", () => {
		expect(treasurePatch.parse({ minAmount: "40" }).minAmount).toBe(40);
	});

	/** The cooldown is stored in milliseconds, so the bound is a minute count multiplied out. */
	it("holds the cooldown between a minute and a day", () => {
		expect(treasurePatch.safeParse({ cooldownMs: 59_000 }).success).toBe(false);
		expect(treasurePatch.safeParse({ cooldownMs: 60_000 }).success).toBe(true);
		expect(treasurePatch.safeParse({ cooldownMs: 1_441 * 60_000 }).success).toBe(false);
	});

	it("refuses a fractional message count", () => {
		expect(treasurePatch.safeParse({ minMessages: 12.5 }).success).toBe(false);
	});
});

describe("treasureProblem", () => {
	const fine = { minMessages: 10, maxMessages: 50, minAmount: 10, maxAmount: 500 };

	/** A range whose floor is above its ceiling picks no number at all, so the drop would never fire. */
	it("refuses a message range the wrong way round", () => {
		expect(problemText(treasureProblem({ ...fine, minMessages: 60 }))).toMatch(/fewest messages/i);
	});

	it("refuses a drop size the wrong way round", () => {
		expect(problemText(treasureProblem({ ...fine, minAmount: 900 }))).toMatch(/smallest drop/i);
	});
});
