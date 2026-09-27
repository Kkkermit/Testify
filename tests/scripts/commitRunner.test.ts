import { buildMessage, formatSubject } from "../../scripts/commitRunner";

describe("formatSubject", () => {
	it("capitalises the first letter", () => {
		expect(formatSubject("added the thing")).toBe("Added the thing");
	});

	it("leaves an already-capitalised subject alone", () => {
		expect(formatSubject("Added the thing")).toBe("Added the thing");
	});

	it("trims surrounding whitespace", () => {
		expect(formatSubject("  added it  ")).toBe("Added it");
	});

	/** commitlint rejects a trailing full stop, so the wizard must not produce one. */
	it("strips a trailing full stop", () => {
		expect(formatSubject("added it.")).toBe("Added it");
		expect(formatSubject("added it...")).toBe("Added it");
	});

	it("does not mangle a subject that is only punctuation", () => {
		expect(() => formatSubject("...")).not.toThrow();
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
