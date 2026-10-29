import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrast, luminance } from "./contrast";
import { ACCENTS } from "@/hooks/useAccent";

/** The palette against WCAG 2.2, read from `index.css`, because jsdom cannot measure contrast. */

const CSS = readFileSync(resolve(__dirname, "../index.css"), "utf8");

type Scheme = "light" | "dark";

/** The half of a token the theme under test renders. */
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

const SCHEMES = ["light", "dark"] as const;

/** Each pair is [name, foreground, background, threshold]; what comes back names every one that falls short. */
function shortfalls(pairs: [name: string, colour: string, against: string, need: number][]): string[] {
	return pairs.flatMap(([name, colour, against, need]) => {
		const ratio = contrast(colour, against);

		return ratio >= need ? [] : [`${name}: ${ratio.toFixed(2)} < ${String(need)}`];
	});
}

it("meets every threshold the base palette is used at, in both themes", () => {
	const missed = SCHEMES.flatMap((scheme) => {
		const of = (name: string): string => token(name, scheme);
		const page = of("background");
		const card = of("card");

		return shortfalls(
			(
				[
					["foreground on the page", of("foreground"), page, TEXT],
					["foreground on a card", of("foreground"), card, TEXT],
					["muted text on the page", of("muted-foreground"), page, TEXT],
					["muted text on a card", of("muted-foreground"), card, TEXT],
					["muted text on a recessed fill", of("muted-foreground"), of("muted"), TEXT],
					["a link on the page", of("accent"), page, TEXT],
					["a link on a card", of("accent"), card, TEXT],
					["red text on a card", of("destructive-text"), card, TEXT],
					["success on a card", of("success"), card, TEXT],
					["warning on a card", of("warning"), card, TEXT],
					["a field border on a card", of("input"), card, NON_TEXT],
					["the focus ring on the page", of("ring"), page, NON_TEXT],
					["a filled primary against the page", of("primary"), page, NON_TEXT],
					// A filled button is measured with the text colour it actually draws, not `foreground`.
					["white on primary", "#ffffff", of("primary"), TEXT],
					["white on destructive", "#ffffff", of("destructive"), TEXT],
					// Each tint is an icon colour and a 15% wash, so the icon has to survive on a card.
					...["levelling", "economy", "moderation", "welcome", "tickets", "community"].map(
						(feature) => [`the ${feature} tint on a card`, of(`feature-${feature}`), card, TEXT] as const,
					),
				] as [string, string, string, number][]
			).map(([name, ...rest]) => [`${scheme}: ${name}`, ...rest]),
		);
	});

	expect(missed).toEqual([]);
});

it("keeps the fill violet and the text violet as separate tokens", () => {
	for (const scheme of SCHEMES) expect(token("primary", scheme)).not.toBe(token("accent", scheme));
});

/** The dark fill violet (3.47:1) stays out of use as body text. */
it("keeps the dark fill violet out of reach as a text colour", () => {
	expect(contrast(token("primary", "dark"), token("background", "dark"))).toBeLessThan(TEXT);
});

/** Every accent the picker offers, in both themes. */
it("meets every threshold with each accent, in both themes", () => {
	const missed = ACCENTS.flatMap((accent) =>
		SCHEMES.flatMap((scheme) => {
			const of = (name: string): string => accentToken(accent, name, scheme);
			const page = token("background", scheme);
			const card = token("card", scheme);

			return shortfalls([
				[`${accent} in ${scheme}: a link on the page`, of("accent"), page, TEXT],
				[`${accent} in ${scheme}: a link on a card`, of("accent"), card, TEXT],
				[`${accent} in ${scheme}: a filled button against the page`, of("primary"), page, NON_TEXT],
				[`${accent} in ${scheme}: the focus ring on the page`, of("ring"), page, NON_TEXT],
				// The fill only ever wears white, so this is the pair a button actually draws.
				[`${accent} in ${scheme}: white on its fill`, "#ffffff", of("primary"), TEXT],
			]);
		}),
	);

	expect(missed).toEqual([]);
});

/** The same hazard the base violet has: a fill that reads as legible text on near-black, and is not. */
it("keeps every accent's dark fill out of reach as a text colour", () => {
	const legible = ACCENTS.filter(
		(accent) => contrast(accentToken(accent, "primary", "dark"), token("background", "dark")) >= TEXT,
	);

	expect(legible).toEqual([]);
});

/** The violet block has to match the base tokens, or its swatch shows a colour it does not select. */
it("keeps the violet block equal to the base tokens", () => {
	for (const scheme of SCHEMES) {
		for (const name of ["primary", "accent", "ring"])
			expect(accentToken("violet", name, scheme)).toBe(token(name, scheme));
	}
});
