import { type TreasureSettings } from "@testify/shared";
import {
	describeRate,
	draftOf,
	draftProblem,
	isDirty,
	toMilliseconds,
	toMinutes,
} from "@/features/treasure/treasure.utils";

const SETTINGS: TreasureSettings = {
	enabled: true,
	minMessages: 15,
	maxMessages: 50,
	minAmount: 10,
	maxAmount: 500,
	cooldownMs: 300_000,
	configured: true,
};

describe("the cooldown conversion", () => {
	/** The form is in minutes and the record is in milliseconds, so a round trip has to be lossless. */
	it("survives a round trip", () => {
		expect(toMinutes(toMilliseconds(17))).toBe(17);
	});

	it("rounds a stored value that is not a whole minute", () => {
		expect(toMinutes(90_000)).toBe(2);
	});
});

describe("draftOf", () => {
	it("puts the cooldown into the minutes the form shows", () => {
		expect(draftOf(SETTINGS).cooldownMinutes).toBe(5);
	});
});

describe("draftProblem", () => {
	const draft = draftOf(SETTINGS);

	it("says nothing about a draft straight off the defaults", () => {
		expect(draftProblem(draft)).toBeNull();
	});

	/** A range whose floor is above its ceiling picks no number at all, so the drop would never fire. */
	it("refuses a range the wrong way round", () => {
		expect(draftProblem({ ...draft, minMessages: 90 })).toMatch(/fewest messages/i);
		expect(draftProblem({ ...draft, minAmount: 900 })).toMatch(/smallest drop/i);
	});

	it("refuses a number outside its bounds", () => {
		expect(draftProblem({ ...draft, minMessages: 0 })).toMatch(/messages must be between/i);
		expect(draftProblem({ ...draft, maxAmount: 1_000_000 })).toMatch(/drop must be between/i);
		expect(draftProblem({ ...draft, cooldownMinutes: 0 })).toMatch(/cooldown must be between/i);
	});

	/** An emptied number input reads as NaN, which is not a bound failure and must not save. */
	it("refuses a field that has been emptied", () => {
		expect(draftProblem({ ...draft, minAmount: Number.NaN })).not.toBeNull();
	});

	it("refuses a fractional value", () => {
		expect(draftProblem({ ...draft, cooldownMinutes: 2.5 })).not.toBeNull();
	});
});

describe("isDirty", () => {
	it("is false for an untouched draft", () => {
		expect(isDirty(draftOf(SETTINGS), SETTINGS)).toBe(false);
	});

	it("notices a change to any field, including the cooldown it converted", () => {
		expect(isDirty({ ...draftOf(SETTINGS), minAmount: 11 }, SETTINGS)).toBe(true);
		expect(isDirty({ ...draftOf(SETTINGS), cooldownMinutes: 6 }, SETTINGS)).toBe(true);
	});
});

describe("describeRate", () => {
	it("reads the two numbers together rather than as separate settings", () => {
		expect(describeRate(draftOf(SETTINGS))).toBe(
			"A drop of 10–500 every 15–50 messages, at most once every 5 minutes.",
		);
	});

	/** A range of one is a fixed value, and "10–10" reads as a mistake. */
	it("collapses a range whose ends match", () => {
		const draft = { minMessages: 20, maxMessages: 20, minAmount: 5, maxAmount: 5, cooldownMinutes: 3 };

		expect(describeRate(draft)).toBe("A drop of 5 every 20 messages, at most once every 3 minutes.");
	});
});
