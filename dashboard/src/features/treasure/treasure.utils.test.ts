import { type TreasureSettings } from "@testify/shared";
import { describeRate, draftOf, draftProblem, toMilliseconds, toMinutes } from "@/features/treasure/treasure.utils";
import { t } from "@/test/english";

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
});

describe("draftProblem", () => {
	const draft = draftOf(SETTINGS);

	/** A range whose floor is above its ceiling picks no number at all, so the drop would never fire. */
	it("refuses a range the wrong way round", () => {
		expect(draftProblem({ ...draft, minMessages: 90 }, t)).toMatch(/fewest messages/i);
		expect(draftProblem({ ...draft, minAmount: 900 }, t)).toMatch(/smallest drop/i);
	});

	it("refuses a number outside its bounds", () => {
		expect(draftProblem({ ...draft, minMessages: 0 }, t)).toMatch(/messages must be between/i);
		expect(draftProblem({ ...draft, maxAmount: 1_000_000 }, t)).toMatch(/drop must be between/i);
		expect(draftProblem({ ...draft, cooldownMinutes: 0 }, t)).toMatch(/cooldown must be between/i);
	});

	/** An emptied number input reads as NaN, which is not a bound failure and must not save. */
	it("refuses a field that has been emptied", () => {
		expect(draftProblem({ ...draft, minAmount: Number.NaN }, t)).not.toBeNull();
	});

	it("refuses a fractional value", () => {
		expect(draftProblem({ ...draft, cooldownMinutes: 2.5 }, t)).not.toBeNull();
	});
});

describe("describeRate", () => {
	/** A range of one is a fixed value, and "10–10" reads as a mistake. */
	it("collapses a range whose ends match", () => {
		const draft = { minMessages: 20, maxMessages: 20, minAmount: 5, maxAmount: 5, cooldownMinutes: 3 };

		expect(describeRate(draft, t)).toBe("A drop of 5 every 20 messages, at most once every 3 minutes.");
	});
});
