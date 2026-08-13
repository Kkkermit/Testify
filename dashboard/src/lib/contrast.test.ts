import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrast, luminance } from "./contrast";
import { ACCENTS } from "@/hooks/useAccent";

/**
 * The palette, checked against WCAG 2.2 on every run.
 *
 * `jest-axe` cannot do this — jsdom computes no styles, so `color-contrast` is disabled there and the rule can
 * only report false negatives. Before this existed, `text-primary` was used as 14px body text in five places at
 * 3.47:1, which fails AA, and nothing in the repository noticed.
 *
 * The values are read out of `index.css` rather than restated here, so a token edited without checking it fails
 * this file rather than quietly shipping.
 */

const CSS = readFileSync(resolve(__dirname, "../index.css"), "utf8");

type Scheme = "light" | "dark";

/**
 * A token is either `light-dark(a, b)` or a single value used by both themes, so this returns the half the
 * theme under test actually renders. Reading both halves is the point: a light palette nobody measured is
 * worse than no light palette, and only one of the two used to be checked.
 */
function pick(source: string, name: string, scheme: Scheme, where: string): string {
	const pair = new RegExp(`--color-${name}:\\s*light-dark\\(\\s*(#[0-9a-f]{6})\\s*,\\s*(#[0-9a-f]{6})\\s*\\)`, "i");
	const both = pair.exec(source);
	if (both?.[1] !== undefined && both[2] !== undefined) return scheme === "light" ? both[1] : both[2];

	const single = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(source);
	if (single?.[1] === undefined) throw new Error(`--color-${name} is not in ${where}`);

	return single[1];
}

function token(name: string, scheme: Scheme): string {
	return pick(CSS, name, scheme, "index.css");
}

/** An accent overrides three tokens in a block of its own, and every one of them is measured like the base. */
function accentToken(accent: string, name: string, scheme: Scheme): string {
	const block = new RegExp(`\\[data-accent="${accent}"\\]\\s*\\{([^}]*)\\}`).exec(CSS)?.[1];
	if (block === undefined) throw new Error(`[data-accent="${accent}"] is not in index.css`);

	return pick(block, name, scheme, `the ${accent} accent`);
}

/** 4.5:1 for text under 18.66px, 3:1 for a control boundary or a large heading. */
const TEXT = 4.5;
const NON_TEXT = 3;

describe("luminance", () => {
	it("puts black at zero and white at one", () => {
		expect(luminance("#000000")).toBeCloseTo(0, 5);
		expect(luminance("#ffffff")).toBeCloseTo(1, 5);
	});

	it("is unaffected by a leading hash", () => {
		expect(luminance("7c3aed")).toBe(luminance("#7c3aed"));
	});
});

describe("contrast", () => {
	it("is 21 between black and white, and 1 against itself", () => {
		expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
		expect(contrast("#7c3aed", "#7c3aed")).toBeCloseTo(1, 5);
	});

	it("does not care which way round the pair is given", () => {
		expect(contrast("#ffffff", "#07070b")).toBeCloseTo(contrast("#07070b", "#ffffff"), 5);
	});
});

describe.each(["light", "dark"] as const)("the %s palette", (scheme) => {
	const background = token("background", scheme);
	const card = token("card", scheme);
	const token_ = (name: string): string => token(name, scheme);

	it.each([
		["foreground on the page", "foreground", background, TEXT],
		["foreground on a card", "foreground", card, TEXT],
		["muted text on the page", "muted-foreground", background, TEXT],
		["muted text on a card", "muted-foreground", card, TEXT],
		["muted text on a recessed fill", "muted-foreground", "muted", TEXT],
		["a link on the page", "accent", background, TEXT],
		["a link on a card", "accent", card, TEXT],
		["red text on a card", "destructive-text", card, TEXT],
		["success on a card", "success", card, TEXT],
		["warning on a card", "warning", card, TEXT],
		["a field border on a card", "input", card, NON_TEXT],
		["the focus ring on the page", "ring", background, NON_TEXT],
		["a filled primary against the page", "primary", background, NON_TEXT],
	])("%s meets its threshold", (_name, colour, against, need) => {
		const other = against.startsWith("#") ? against : token_(against);

		expect(contrast(token_(colour), other)).toBeGreaterThanOrEqual(need);
	});

	/**
	 * A filled button's own text is the pair that matters, not the fill against the page. Both of these render
	 * white whatever the theme — the destructive variant is `text-white` literally — so checking against
	 * `foreground` would pass in dark for the wrong reason and measure a colour nothing draws in light.
	 */
	it.each([
		["white on primary", "primary"],
		["white on destructive", "destructive"],
	])("%s is legible", (_name, fill) => {
		expect(contrast("#ffffff", token_(fill))).toBeGreaterThanOrEqual(TEXT);
	});

	/** Each tint is used as an icon colour and as a 15% wash, so the icon has to survive on a card. */
	it.each(["levelling", "economy", "moderation", "welcome", "tickets", "community"])(
		"the %s tint is legible on a card",
		(feature) => {
			expect(contrast(token_(`feature-${feature}`), card)).toBeGreaterThanOrEqual(TEXT);
		},
	);

	it("keeps the fill violet and the text violet as separate tokens", () => {
		expect(token_("primary")).not.toBe(token_("accent"));
		expect(contrast(token_("accent"), background)).toBeGreaterThanOrEqual(TEXT);
	});
});

/**
 * On near-black the fill violet measures 3.47:1, and this is the guard that stops it being used as body text
 * again. It is scoped to dark deliberately: the light fill is darker than its own page and legible as text, so
 * asserting the same thing there would be asserting a hazard that does not exist.
 */
it("keeps the dark fill violet out of reach as a text colour", () => {
	expect(contrast(token("primary", "dark"), token("background", "dark"))).toBeLessThan(TEXT);
});

/**
 * Every accent the picker offers, measured in both themes. An unverified accent is worse than no accent: it
 * ships a palette nobody looked at behind a control that invites everybody to try it.
 */
describe.each(ACCENTS)("the %s accent", (accent) => {
	describe.each(["light", "dark"] as const)("in %s", (scheme) => {
		const of = (name: string): string => accentToken(accent, name, scheme);
		const background = token("background", scheme);
		const card = token("card", scheme);

		it.each([
			["a link on the page", "accent", () => background, TEXT],
			["a link on a card", "accent", () => card, TEXT],
			["a filled button against the page", "primary", () => background, NON_TEXT],
			["the focus ring on the page", "ring", () => background, NON_TEXT],
		])("%s meets its threshold", (_name, colour, against, need) => {
			expect(contrast(of(colour), against())).toBeGreaterThanOrEqual(need);
		});

		/** The fill only ever wears white, so this is the pair a button actually draws. */
		it("carries white on its fill", () => {
			expect(contrast("#ffffff", of("primary"))).toBeGreaterThanOrEqual(TEXT);
		});
	});

	/** The same hazard the base violet has: a fill that reads as legible text on near-black, and is not. */
	it("keeps its dark fill out of reach as a text colour", () => {
		expect(contrast(accentToken(accent, "primary", "dark"), token("background", "dark"))).toBeLessThan(TEXT);
	});
});

/**
 * Choosing violet leaves the page unmarked, so the base tokens are what it renders — but a swatch has to paint
 * violet while the page wears another accent, and that needs a block. Two copies is a drift risk, and this is
 * what makes the drift fail rather than ship a picker whose first swatch lies about what it selects.
 */
describe.each(["light", "dark"] as const)("the violet block in %s", (scheme) => {
	it.each(["primary", "accent", "ring"])("matches the base %s token", (name) => {
		expect(accentToken("violet", name, scheme)).toBe(token(name, scheme));
	});
});
