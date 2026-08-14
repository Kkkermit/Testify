import { accentColour, backdropOpacity, cssColour, fieldPaint, isHexColour, pickScheme } from "@/lib/three/tokens";

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

describe("pickScheme", () => {
	/**
	 * `getComputedStyle` never resolves a custom property, so the backdrop receives the token's source text.
	 * Before this existed a `light-dark()` token failed the hex check and every theme got the same fallback.
	 */
	it("takes the half the theme is painted with", () => {
		expect(pickScheme("light-dark(#5b21b6, #a78bfa)", true)).toBe("#a78bfa");
		expect(pickScheme("light-dark(#5b21b6, #a78bfa)", false)).toBe("#5b21b6");
	});

	it("passes a plain value straight through", () => {
		expect(pickScheme("#112233", true)).toBe("#112233");
	});

	it("leaves anything it cannot split alone, rather than returning a fragment", () => {
		expect(pickScheme("light-dark(#5b21b6)", true)).toBe("light-dark(#5b21b6)");
	});
});

describe("accentColour", () => {
	it("uses the token when it is a hex value", () => {
		expect(accentColour(rootWith({ "--color-accent": "#112233" }))).toBe("#112233");
	});

	it("reads the theme's own half of a light-dark token", () => {
		const root = rootWith({ "--color-accent": "light-dark(#5b21b6, #a78bfa)", "color-scheme": "light" });

		expect(accentColour(root)).toBe("#5b21b6");
	});

	/** A palette moved to a wider colour space must not turn the backdrop black. */
	it("falls back when the token is in a form three cannot read", () => {
		expect(accentColour(rootWith({ "--color-accent": "color(display-p3 1 0 0)" }))).toBe("#a78bfa");
	});
});

describe("backdropOpacity", () => {
	/** The same points that read as stars on near-black read as dust on paper, so the strength is per theme. */
	it("takes the half the theme is painted with", () => {
		const both = { "--backdrop-opacity": "light-dark(0.14, 0.5)" };

		expect(backdropOpacity(rootWith({ ...both, "color-scheme": "light" }))).toBeCloseTo(0.14, 5);
		expect(backdropOpacity(rootWith({ ...both, "color-scheme": "dark" }))).toBeCloseTo(0.5, 5);
	});

	it("falls back when the token is missing", () => {
		expect(backdropOpacity(rootWith({ "color-scheme": "dark" }))).toBeCloseTo(0.5, 5);
	});

	/** A token nobody can parse must not put the field at NaN, which draws nothing at all. */
	it("falls back rather than passing a number three cannot use", () => {
		expect(backdropOpacity(rootWith({ "--backdrop-opacity": "thick", "color-scheme": "dark" }))).toBeCloseTo(0.5, 5);
	});

	it("clamps a value outside the range", () => {
		expect(backdropOpacity(rootWith({ "--backdrop-opacity": "4", "color-scheme": "dark" }))).toBe(1);
		expect(backdropOpacity(rootWith({ "--backdrop-opacity": "-2", "color-scheme": "dark" }))).toBe(0);
	});
});

describe("fieldPaint", () => {
	it("reads the colour and the strength from the same theme", () => {
		const root = rootWith({
			"--color-accent": "light-dark(#5b21b6, #a78bfa)",
			"--backdrop-opacity": "light-dark(0.14, 0.5)",
			"color-scheme": "light",
		});

		expect(fieldPaint(root)).toEqual({ colour: "#5b21b6", opacity: 0.14 });
	});
});
