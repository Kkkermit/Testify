import { accentColour, cssColour, isHexColour } from "@/lib/three/tokens";

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

describe("isHexColour", () => {
	it("accepts both hex lengths", () => {
		expect(isHexColour("#fff")).toBe(true);
		expect(isHexColour("#A78BFA")).toBe(true);
	});

	it("rejects anything three would not parse", () => {
		expect(isHexColour("oklch(70% 0.1 300)")).toBe(false);
		expect(isHexColour("rebeccapurple")).toBe(false);
		expect(isHexColour("")).toBe(false);
	});
});

describe("accentColour", () => {
	it("uses the token when it is a hex value", () => {
		expect(accentColour(rootWith({ "--color-accent": "#112233" }))).toBe("#112233");
	});

	/** A palette moved to a wider colour space must not turn the backdrop black. */
	it("falls back when the token is in a form three cannot read", () => {
		expect(accentColour(rootWith({ "--color-accent": "color(display-p3 1 0 0)" }))).toBe("#a78bfa");
	});
});
