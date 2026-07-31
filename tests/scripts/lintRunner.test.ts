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
	it("adds up errors and warnings", () => {
		expect(totalsOf([result(2, 1), result(0, 3)])).toEqual({ files: 2, errors: 2, warnings: 4, fixable: 0 });
	});

	it("counts only files that actually reported something", () => {
		expect(totalsOf([result(0, 0), result(1, 0)]).files).toBe(1);
	});

	it("copes with no results at all", () => {
		expect(totalsOf([])).toEqual({ files: 0, errors: 0, warnings: 0, fixable: 0 });
	});
});

/** The substance of the runner: a warning is there to be seen, not to stop work. */
describe("exitCodeFor", () => {
	it("fails on an error", () => {
		expect(exitCodeFor({ files: 1, errors: 1, warnings: 0, fixable: 0 })).toBe(1);
	});

	it("does not fail on warnings alone, however many", () => {
		expect(exitCodeFor({ files: 9, errors: 0, warnings: 99, fixable: 0 })).toBe(0);
	});

	it("passes a clean run", () => {
		expect(exitCodeFor({ files: 0, errors: 0, warnings: 0, fixable: 0 })).toBe(0);
	});
});

describe("summarise", () => {
	it("says so when there is nothing to report", () => {
		expect(summarise({ files: 0, errors: 0, warnings: 0, fixable: 0 })).toContain("No problems");
	});

	it("reports both counts and the file total", () => {
		const text = summarise({ files: 3, errors: 2, warnings: 5, fixable: 0 });

		expect(text).toContain("2 error(s)");
		expect(text).toContain("5 warning(s)");
		expect(text).toContain("3 file(s)");
	});

	it("mentions --fix only when something is fixable", () => {
		expect(summarise({ files: 1, errors: 1, warnings: 0, fixable: 1 })).toContain("--fix");
		expect(summarise({ files: 1, errors: 1, warnings: 0, fixable: 0 })).not.toContain("--fix");
	});
});
