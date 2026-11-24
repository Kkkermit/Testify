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

	/**
	 * A range whose floor is above its ceiling picks no number at all, so the drop would never fire, and an emptied
	 * number input reads as NaN, which is not a bound failure and must not save either.
	 */
	it("refuses a backwards range, a number out of bounds, an emptied field and a fraction", () => {
		const refused: [Partial<typeof draft>, RegExp][] = [
			[{ minMessages: 90 }, /fewest messages/i],
			[{ minAmount: 900 }, /smallest drop/i],
			[{ minMessages: 0 }, /messages must be between/i],
			[{ maxAmount: 1_000_000 }, /drop must be between/i],
			[{ cooldownMinutes: 0 }, /cooldown must be between/i],
			[{ minAmount: Number.NaN }, /drop must be between/i],
			[{ cooldownMinutes: 2.5 }, /cooldown must be between/i],
		];
		const wrong = refused.filter(([change, said]) => !said.test(draftProblem({ ...draft, ...change }, t) ?? ""));

		expect(wrong).toEqual([]);
		expect(draftProblem(draft, t)).toBeNull();
	});
});

describe("describeRate", () => {
	/** A range of one is a fixed value, and "10–10" reads as a mistake. */
	it("collapses a range whose ends match", () => {
		const draft = { minMessages: 20, maxMessages: 20, minAmount: 5, maxAmount: 5, cooldownMinutes: 3 };

		expect(describeRate(draft, t)).toBe("A drop of 5 every 20 messages, at most once every 3 minutes.");
	});
});
