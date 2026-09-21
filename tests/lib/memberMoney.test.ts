import { problemText } from "@lib/problemText.util";
import { levelBody, MEMBER_LIMITS, moneyBody, moneyProblem } from "@testify/shared";

describe("moneyProblem", () => {
	it("accepts an amount they can afford to lose", () => {
		expect(problemText(moneyProblem(-100, "wallet", 500))).toBeNull();
	});

	it("accepts any addition inside the cap", () => {
		expect(problemText(moneyProblem(MEMBER_LIMITS.maxMoneyChange, "bank", 0))).toBeNull();
	});

	/** Nothing else in the economy can produce a negative balance, so a manager must not be able to either. */
	it("refuses taking more than they hold", () => {
		expect(problemText(moneyProblem(-501, "wallet", 500))).toMatch(/only have 500/i);
	});

	it("allows taking exactly what they hold", () => {
		expect(problemText(moneyProblem(-500, "wallet", 500))).toBeNull();
	});

	it.each([0, 1.5, Number.NaN])("refuses %p as an amount", (delta) => {
		expect(problemText(moneyProblem(delta, "wallet", 500))).toMatch(/enter an amount/i);
	});

	it("refuses a change past the cap", () => {
		expect(problemText(moneyProblem(MEMBER_LIMITS.maxMoneyChange + 1, "wallet", 0))).toMatch(/cannot be more than/i);
	});

	it("names the purse it is talking about", () => {
		expect(problemText(moneyProblem(-10, "bank", 0))).toContain("bank");
	});
});

describe("moneyBody", () => {
	it("accepts a whole amount for a purse it knows", () => {
		expect(moneyBody.safeParse({ purse: "wallet", delta: 250 }).success).toBe(true);
	});

	it.each([
		{ purse: "pocket", delta: 10 },
		{ purse: "wallet", delta: 0 },
		{ purse: "wallet", delta: MEMBER_LIMITS.maxMoneyChange + 1 },
	])("refuses %p", (body) => {
		expect(moneyBody.safeParse(body).success).toBe(false);
	});
});

describe("levelBody", () => {
	it("accepts a level on its own", () => {
		expect(levelBody.safeParse({ level: 10 }).success).toBe(true);
	});

	it("accepts an XP change on its own, in either direction", () => {
		expect(levelBody.safeParse({ xp: 400 }).success).toBe(true);
		expect(levelBody.safeParse({ xp: -400 }).success).toBe(true);
	});

	/** Setting a level rewrites the XP, so accepting both would silently discard one of them. */
	it("refuses both at once", () => {
		expect(levelBody.safeParse({ level: 10, xp: 400 }).success).toBe(false);
	});

	it("refuses neither", () => {
		expect(levelBody.safeParse({}).success).toBe(false);
	});

	it.each([-1, MEMBER_LIMITS.maxLevel + 1, 1.5])("refuses level %p", (level) => {
		expect(levelBody.safeParse({ level }).success).toBe(false);
	});
});
