import { problemText } from "@lib/format/problemText.util";
import { PROBLEM_CODES, moneyProblem, treasureProblem } from "@testify/shared";

describe("problemText", () => {
	/** A code with no sentence renders as `undefined` to whoever was told why their change was refused. */
	it("writes a sentence for every code shared can return", () => {
		for (const code of PROBLEM_CODES) {
			const sentence = problemText({ code, values: { max: 5, min: 5, held: 5 } });

			expect(sentence).toMatch(/[a-z]/i);
			expect(sentence).not.toContain("undefined");
		}
	});

	it("interpolates the numbers the refusal carries", () => {
		expect(problemText(moneyProblem(-501, "wallet", 500))).toBe("They only have 500 in their wallet.");
	});

	it("names the purse the shortfall is in", () => {
		expect(problemText(moneyProblem(-10, "bank", 0))).toContain("bank");
	});

	it("says nothing about a draft that is fine", () => {
		expect(problemText(treasureProblem({ minMessages: 5, maxMessages: 10, minAmount: 1, maxAmount: 2 }))).toBeNull();
	});
});
