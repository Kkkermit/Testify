import { markSpans } from "@/features/welcome/welcome.utils";

/** `[["Hi", []], ["there", ["bold"]]]` reads much better than the object form in an expectation. */
function shape(text: string): [string, string[]][] {
	return markSpans(text).map((span) => [span.text, span.marks]);
}

describe("markSpans", () => {
	it("leaves unmarked text alone", () => {
		expect(shape("Welcome!")).toEqual([["Welcome!", []]]);
	});

	it("reads each of Discord's inline marks", () => {
		expect(shape("**b**")).toEqual([["b", ["bold"]]]);
		expect(shape("*i*")).toEqual([["i", ["italic"]]]);
		expect(shape("_i_")).toEqual([["i", ["italic"]]]);
		expect(shape("__u__")).toEqual([["u", ["underline"]]]);
		expect(shape("~~s~~")).toEqual([["s", ["strike"]]]);
		expect(shape("`c`")).toEqual([["c", ["code"]]]);
	});

	/** `**` read as two `*` would bold nothing and italicise an empty string. */
	it("prefers the longer mark over its prefix", () => {
		expect(shape("**bold**")).toEqual([["bold", ["bold"]]]);
		expect(shape("__under__")).toEqual([["under", ["underline"]]]);
	});

	it("keeps the surrounding text", () => {
		expect(shape("Welcome to **Testify HQ**, friend")).toEqual([
			["Welcome to ", []],
			["Testify HQ", ["bold"]],
			[", friend", []],
		]);
	});

	it("carries both marks through a nesting", () => {
		expect(shape("**bold _and italic_**")).toEqual([
			["bold ", ["bold"]],
			["and italic", ["bold", "italic"]],
		]);
	});

	/** Discord shows an unclosed mark as typed, so a half-written message must not suddenly bold the rest. */
	it("leaves an unclosed mark literal", () => {
		expect(shape("**not closed")).toEqual([["**not closed", []]]);
		expect(shape("a * b")).toEqual([["a * b", []]]);
	});

	it("honours a backslash escape", () => {
		expect(shape("\\*\\*literal\\*\\*")).toEqual([["**literal**", []]]);
	});

	it("survives an empty message", () => {
		expect(markSpans("")).toEqual([]);
	});
});
