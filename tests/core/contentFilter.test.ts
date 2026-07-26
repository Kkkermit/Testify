import { censor, containsProfanity, findProfanity } from "../../src/core/contentFilter";

describe("content filter", () => {
	it("detects a plain blocked word", () => {
		expect(containsProfanity("you are a bastard")).toBe(true);
	});

	it("ignores clean text", () => {
		expect(containsProfanity("what a lovely afternoon")).toBe(false);
	});

	// The previous implementation used Array.includes on the raw word list, so
	// casing and punctuation variants slipped straight through.
	it("catches casing and punctuation variants", () => {
		expect(containsProfanity("BASTARD!")).toBe(true);
		expect(containsProfanity("...bastard,")).toBe(true);
	});

	it("catches simple character substitutions", () => {
		expect(containsProfanity("b4stard")).toBe(true);
	});

	it("does not flag words that merely contain a blocked substring", () => {
		expect(containsProfanity("assassin classic")).toBe(false);
	});

	it("reports which words matched", () => {
		expect(findProfanity("bastard bastard")).toEqual(["bastard"]);
	});

	it("censors matches while leaving the rest intact", () => {
		expect(censor("you bastard")).toBe("you \\*\\*\\*\\*\\*\\*\\*");
	});
});
