import type { ESLint } from "eslint";
import { exitCodeFor, summarise, totalsOf } from "../../scripts/lintRunner";

function result(errorCount: number, warningCount: number, fixable = 0): ESLint.LintResult {
	return {
		errorCount,
		warningCount,
		fixableErrorCount: fixable,
		fixableWarningCount: 0,
	} as ESLint.LintResult;
}

describe("totalsOf", () => {
	it("adds up errors and warnings, counting only the files that reported something", () => {
		expect(totalsOf([result(2, 1), result(0, 0), result(0, 3, 2)])).toEqual({
			files: 2,
			errors: 2,
			warnings: 4,
			fixable: 2,
		});
		expect(totalsOf([])).toEqual({ files: 0, errors: 0, warnings: 0, fixable: 0 });
	});
});

/** A warning is there to be seen, not to stop work. */
describe("exitCodeFor", () => {
	it("fails on an error and on nothing else", () => {
		expect([
			exitCodeFor({ files: 1, errors: 1, warnings: 0, fixable: 0 }),
			exitCodeFor({ files: 9, errors: 0, warnings: 99, fixable: 0 }),
			exitCodeFor({ files: 0, errors: 0, warnings: 0, fixable: 0 }),
		]).toEqual([1, 0, 0]);
	});
});

describe("summarise", () => {
	it("says so when there is nothing to report", () => {
		expect(summarise({ files: 0, errors: 0, warnings: 0, fixable: 0 })).toContain("No problems");
	});

	it("reports both counts and the file total, and mentions --fix only when something is fixable", () => {
		const text = summarise({ files: 3, errors: 2, warnings: 5, fixable: 1 });

		for (const part of ["2 error(s)", "5 warning(s)", "3 file(s)", "--fix"]) expect(text).toContain(part);
		expect(summarise({ files: 1, errors: 1, warnings: 0, fixable: 0 })).not.toContain("--fix");
	});
});
