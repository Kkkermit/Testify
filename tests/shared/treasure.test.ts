import { TREASURE_LIMITS, treasurePatch, treasureProblem } from "@testify/shared";

describe("treasurePatch", () => {
	it("takes each field on its own, because each control writes alone", () => {
		expect(treasurePatch.safeParse({ enabled: false }).success).toBe(true);
		expect(treasurePatch.safeParse({ minMessages: 20 }).success).toBe(true);
		expect(treasurePatch.safeParse({}).success).toBe(true);
	});

	/** The number arrives from a form as a string, so it has to coerce rather than refuse. */
	it("takes a number that arrived as text", () => {
		expect(treasurePatch.parse({ minAmount: "40" }).minAmount).toBe(40);
	});

	it("holds the message count inside its bounds", () => {
		expect(treasurePatch.safeParse({ minMessages: TREASURE_LIMITS.minMessages - 1 }).success).toBe(false);
		expect(treasurePatch.safeParse({ maxMessages: TREASURE_LIMITS.maxMessages + 1 }).success).toBe(false);
		expect(treasurePatch.safeParse({ maxMessages: TREASURE_LIMITS.maxMessages }).success).toBe(true);
	});

	it("holds the drop size inside its bounds", () => {
		expect(treasurePatch.safeParse({ minAmount: 0 }).success).toBe(false);
		expect(treasurePatch.safeParse({ maxAmount: TREASURE_LIMITS.maxAmount + 1 }).success).toBe(false);
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

	it("says nothing when both pairs are the right way round", () => {
		expect(treasureProblem(fine)).toBeNull();
	});

	/** A range whose floor is above its ceiling picks no number at all, so the drop would never fire. */
	it("refuses a message range the wrong way round", () => {
		expect(treasureProblem({ ...fine, minMessages: 60 })).toMatch(/fewest messages/i);
	});

	it("refuses a drop size the wrong way round", () => {
		expect(treasureProblem({ ...fine, minAmount: 900 })).toMatch(/smallest drop/i);
	});

	it("allows a range that is a single value", () => {
		expect(treasureProblem({ minMessages: 20, maxMessages: 20, minAmount: 5, maxAmount: 5 })).toBeNull();
	});
});
