import { problemText } from "@lib/format/problemText.util";
import { PROBLEM_CODES, moneyProblem } from "@testify/shared";

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
});
