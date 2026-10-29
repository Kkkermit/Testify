import { COLOUR_CHOICES, resolveColour } from "@lib/discord/colours.util";

describe("COLOUR_CHOICES", () => {
	it("stays within Discord's 25-option limit for a choice list", () => {
		expect(COLOUR_CHOICES.length).toBeLessThanOrEqual(25);
	});
});

describe("resolveColour", () => {
	it.each(["red", "#fff", "#gggggg", "#1234567", "", "1a2b3c"])("falls back on %p rather than throwing", (input) => {
		expect(resolveColour(input)).toBe("#7289da");
	});
});
