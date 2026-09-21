import { PROBLEM_CODES, moneyProblem, treasureProblem } from "@testify/shared";
import { problemText } from "@/lib/problemText";
import { t } from "@/test/english";

describe("problemText", () => {
	/** A code with no key renders the key itself, which reads as a bug rather than as advice. */
	it("translates every code shared can return", () => {
		for (const code of PROBLEM_CODES) {
			const sentence = problemText({ code, values: { max: 5, min: 5, held: 5 } }, t);

			expect(sentence).not.toContain("problem.");
			expect(sentence).not.toContain("undefined");
		}
	});

	it("interpolates the numbers the refusal carries", () => {
		expect(problemText(moneyProblem(-501, "wallet", 500), t)).toBe("They only have 500 in their wallet.");
	});

	it("says nothing about a draft that is fine", () => {
		expect(problemText(treasureProblem({ minMessages: 5, maxMessages: 10, minAmount: 1, maxAmount: 2 }), t)).toBeNull();
	});
});
