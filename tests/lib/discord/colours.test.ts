import { COLOUR_CHOICES, resolveColour } from "@lib/discord/colours.util";

describe("COLOUR_CHOICES", () => {
	it("stays within Discord's 25-option limit for a choice list", () => {
		expect(COLOUR_CHOICES.length).toBeLessThanOrEqual(25);
	});
});

describe("resolveColour", () => {
	it("falls back on anything that is not six hex digits, rather than throwing", () => {
		const unread = ["red", "#fff", "#gggggg", "#1234567", "", "1a2b3c"];

		expect(unread.filter((input) => resolveColour(input) !== "#7289da")).toEqual([]);
		expect(resolveColour("#ABCDEF")).toBe("#abcdef");
	});
});
