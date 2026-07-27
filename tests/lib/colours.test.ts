import { COLOUR_CHOICES, resolveColour } from "@lib/colours.util";

describe("COLOUR_CHOICES", () => {
	it("stays within Discord's 25-option limit for a choice list", () => {
		expect(COLOUR_CHOICES.length).toBeLessThanOrEqual(25);
	});

	it("offers only values resolveColour will accept", () => {
		for (const choice of COLOUR_CHOICES) {
			expect(resolveColour(choice.value)).toBe(choice.value.toLowerCase());
		}
	});

	it("has no duplicate names or values", () => {
		expect(new Set(COLOUR_CHOICES.map((choice) => choice.name)).size).toBe(COLOUR_CHOICES.length);
		expect(new Set(COLOUR_CHOICES.map((choice) => choice.value)).size).toBe(COLOUR_CHOICES.length);
	});
});

describe("resolveColour", () => {
	it("accepts a six-digit hex colour", () => {
		expect(resolveColour("#a1b2c3")).toBe("#a1b2c3");
	});

	it("normalises to lower case, so the same colour is one value", () => {
		expect(resolveColour("#AABBCC")).toBe("#aabbcc");
	});

	it("falls back when the option was not supplied", () => {
		expect(resolveColour(null)).toBe("#7289da");
	});

	it("uses a caller's fallback instead of the default", () => {
		expect(resolveColour(null, "#123456")).toBe("#123456");
	});

	it.each(["red", "#fff", "#gggggg", "#1234567", "", "1a2b3c"])("falls back on %p rather than throwing", (input) => {
		expect(resolveColour(input)).toBe("#7289da");
	});
});
