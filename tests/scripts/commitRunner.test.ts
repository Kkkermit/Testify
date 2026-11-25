import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildMessage, formatSubject, subjectProblem, TYPES } from "../../scripts/commitRunner";

describe("formatSubject", () => {
	it("trims the subject and capitalises its first letter", () => {
		const cases: [typed: string, written: string][] = [
			["added the thing", "Added the thing"],
			["Added the thing", "Added the thing"],
			["  added it  ", "Added it"],
			["...", ""],
		];

		expect(cases.filter(([typed, written]) => formatSubject(typed) !== written)).toEqual([]);
	});

	/** commitlint rejects a trailing full stop, so the wizard must not produce one. */
	it("strips a trailing full stop", () => {
		expect(formatSubject("added it.")).toBe("Added it");
		expect(formatSubject("added it...")).toBe("Added it");
	});
});

describe("buildMessage", () => {
	it("writes the house format", () => {
		expect(buildMessage("feat", "added the thing")).toBe("feat: Added the thing");
	});

	/** The message goes to git as an argv element, so characters that would break a shell string are just data. */
	it("passes shell metacharacters through untouched", () => {
		expect(buildMessage("fix", 'handle a " quote and a $VAR and a `tick`')).toBe(
			'fix: Handle a " quote and a $VAR and a `tick`',
		);
	});
});

describe("the subject question", () => {
	/** A subject one character too long passed the wizard and was then refused by the commit-msg hook. */
	it("refuses what commitlint would, while it is still being typed", () => {
		expect(subjectProblem("fix", "   ")).toMatch(/required/);
		expect(subjectProblem("fix", "a".repeat(95))).toBeNull();
		expect(subjectProblem("fix", "a".repeat(96))).toMatch(/101 characters/);
		expect(subjectProblem("refactor", "a".repeat(91))).toMatch(/101 characters/);
	});

	/** A type the wizard offers but commitlint refuses is a commit that fails after every question was answered. */
	it("offers exactly the types commitlint accepts", () => {
		const config = readFileSync(resolve(__dirname, "../../commitlint.config.mjs"), "utf8");
		const accepted = /"type-enum":\s*\[\s*2,\s*"always",\s*\[([^\]]*)\]/.exec(config)?.[1] ?? "";

		expect(TYPES.map((type) => type.value)).toEqual([...accepted.matchAll(/"([a-z]+)"/g)].map(([, type]) => type));
	});
});
