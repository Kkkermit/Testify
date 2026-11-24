import { problemText } from "@lib/format/problemText.util";
import { levelBody, MEMBER_LIMITS, moneyBody, moneyProblem } from "@testify/shared";

describe("moneyProblem", () => {
	/** Nothing else in the economy can produce a negative balance, so a manager must not be able to either. */
	it("refuses taking more than they hold", () => {
		expect(problemText(moneyProblem(-501, "wallet", 500))).toMatch(/only have 500/i);
	});

	it("refuses an amount that is nothing, a fraction or not a number", () => {
		const accepted = [0, 1.5, Number.NaN].filter(
			(delta) => !/enter an amount/i.test(problemText(moneyProblem(delta, "wallet", 500)) ?? ""),
		);

		expect(accepted).toEqual([]);
	});

	it("refuses a change past the cap", () => {
		expect(problemText(moneyProblem(MEMBER_LIMITS.maxMoneyChange + 1, "wallet", 0))).toMatch(/cannot be more than/i);
	});
});

describe("moneyBody", () => {
	it("refuses a purse that does not exist, nothing, and a change past the cap", () => {
		const bodies = [
			{ purse: "pocket", delta: 10 },
			{ purse: "wallet", delta: 0 },
			{ purse: "wallet", delta: MEMBER_LIMITS.maxMoneyChange + 1 },
		];

		expect(bodies.filter((body) => moneyBody.safeParse(body).success)).toEqual([]);
	});
});

describe("levelBody", () => {
	/** Setting a level rewrites the XP, so accepting both would silently discard one of them. */
	it("refuses both at once", () => {
		expect(levelBody.safeParse({ level: 10, xp: 400 }).success).toBe(false);
	});

	it("refuses neither", () => {
		expect(levelBody.safeParse({}).success).toBe(false);
	});

	it("refuses a level below nothing, past the cap or in between two", () => {
		const levels = [-1, MEMBER_LIMITS.maxLevel + 1, 1.5];

		expect(levels.filter((level) => levelBody.safeParse({ level }).success)).toEqual([]);
	});
});
