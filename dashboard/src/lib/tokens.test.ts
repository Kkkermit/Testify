import { cssColour, pickScheme, themeColour } from "@/lib/tokens";

function rootWith(properties: Record<string, string>): Element {
	const element = document.createElement("div");
	for (const [name, value] of Object.entries(properties)) element.style.setProperty(name, value);
	document.body.append(element);
	return element;
}

describe("cssColour", () => {
	it("reads the token off the element it is given", () => {
		expect(cssColour("--color-accent", "#000000", rootWith({ "--color-accent": "#a78bfa" }))).toBe("#a78bfa");
	});

	it("falls back when the token is not set", () => {
		expect(cssColour("--color-missing", "#123456", rootWith({}))).toBe("#123456");
	});
});

describe("pickScheme", () => {
	/** A `light-dark()` token arrives as source text, so the theme's half has to be picked. */
	it("takes the half the theme is painted with", () => {
		expect(pickScheme("light-dark(#5b21b6, #a78bfa)", true)).toBe("#a78bfa");
		expect(pickScheme("light-dark(#5b21b6, #a78bfa)", false)).toBe("#5b21b6");
	});

	it("leaves anything it cannot split alone, rather than returning a fragment", () => {
		expect(pickScheme("light-dark(#5b21b6)", true)).toBe("light-dark(#5b21b6)");
	});
});

describe("themeColour", () => {
	it("reads the half of a light-dark token for the scheme the page is showing", () => {
		const both = { "--color-accent": "light-dark(#7a2260, #e08ac4)" };

		expect(themeColour("--color-accent", "#000000", rootWith({ ...both, "color-scheme": "light" }))).toBe("#7a2260");
		expect(themeColour("--color-accent", "#000000", rootWith({ ...both, "color-scheme": "dark" }))).toBe("#e08ac4");
	});
});
