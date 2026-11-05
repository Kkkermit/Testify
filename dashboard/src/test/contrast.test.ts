import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrast, luminance } from "./contrast";
import { ACCENTS } from "@/hooks/useAccent";
import { fromHsl, toHex } from "@/lib/colour";
import { customAccent, customProperties } from "@/lib/customAccent";

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

/** An accent overrides its tokens in a block of its own, and every one of them is measured like the base. */
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
					["foreground in the sidebar", of("foreground"), of("sidebar"), TEXT],
					["muted text in the sidebar", of("muted-foreground"), of("sidebar"), TEXT],
					["accent text on its wash", of("accent"), of("accent-wash"), TEXT],
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
					// The hues letter an avatar, colour code, mark an alert and name a category, so each is read as text on a card.
					...["violet", "amber", "red", "green", "blue", "pink"].map(
						(hue) => [`the ${hue} hue on a card`, of(`hue-${hue}`), card, TEXT] as const,
					),
					// A category's icon sits on the recessed fill, where it is a graphic rather than text.
					...["violet", "amber", "red", "green", "blue", "pink"].map(
						(hue) => [`the ${hue} hue on a recessed fill`, of(`hue-${hue}`), of("muted"), NON_TEXT] as const,
					),
				] as [string, string, string, number][]
			).map(([name, ...rest]) => [`${scheme}: ${name}`, ...rest]),
		);
	});

	expect(missed).toEqual([]);
});

it("keeps the fill accent and the text accent as separate tokens", () => {
	for (const scheme of SCHEMES) expect(token("primary", scheme)).not.toBe(token("accent", scheme));
});

/** The dark fill stays out of use as body text, because it is only legible as a fill. */
it("keeps the dark fill out of reach as a text colour", () => {
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
				[`${accent} in ${scheme}: accent text on its wash`, of("accent"), of("accent-wash"), TEXT],
				[`${accent} in ${scheme}: a filled button against the page`, of("primary"), page, NON_TEXT],
				[`${accent} in ${scheme}: the focus ring on the page`, of("ring"), page, NON_TEXT],
				// The fill only ever wears white, so this is the pair a button actually draws.
				[`${accent} in ${scheme}: white on its fill`, "#ffffff", of("primary"), TEXT],
			]);
		}),
	);

	expect(missed).toEqual([]);
});

/** The same hazard the base fill has: one that reads as legible text on the dark ground, and is not. */
it("keeps every accent's dark fill out of reach as a text colour", () => {
	const legible = ACCENTS.filter(
		(accent) => contrast(accentToken(accent, "primary", "dark"), token("background", "dark")) >= TEXT,
	);

	expect(legible).toEqual([]);
});

/** The plum block has to match the base tokens, or its swatch shows a colour it does not select. */
it("keeps the plum block equal to the base tokens", () => {
	for (const scheme of SCHEMES) {
		for (const name of ["primary", "accent", "accent-wash", "ring"])
			expect(accentToken("plum", name, scheme)).toBe(token(name, scheme));
	}
});

/** A spread of what somebody might pick: every twentieth hue, from grey to full colour, from black to white. */
function pickedColours(): string[] {
	const picked: string[] = [];
	for (let h = 0; h < 360; h += 20) {
		for (const s of [0, 0.2, 0.5, 0.8, 1]) {
			for (const l of [0, 0.05, 0.15, 0.3, 0.45, 0.5, 0.55, 0.7, 0.85, 0.95, 1])
				picked.push(toHex(fromHsl({ h, s, l })));
		}
	}
	return [...new Set(picked)];
}

/** A colour somebody types is held to everything a swatch is, plus the wash, which only a custom accent moves. */
it("meets every threshold with any colour somebody picks, in both themes", () => {
	const missed = pickedColours().flatMap((picked) => {
		const shades = customAccent({
			r: Number.parseInt(picked.slice(1, 3), 16),
			g: Number.parseInt(picked.slice(3, 5), 16),
			b: Number.parseInt(picked.slice(5, 7), 16),
		});

		return SCHEMES.flatMap((scheme) => {
			const { primary, accent, wash } = shades[scheme];
			const ring = scheme === "light" ? primary : accent;
			const page = token("background", scheme);
			const card = token("card", scheme);

			return shortfalls([
				[`${picked} in ${scheme}: a link on the page`, accent, page, TEXT],
				[`${picked} in ${scheme}: a link on a card`, accent, card, TEXT],
				[`${picked} in ${scheme}: accent text on its wash`, accent, wash, TEXT],
				[`${picked} in ${scheme}: a filled button against the page`, primary, page, NON_TEXT],
				[`${picked} in ${scheme}: the focus ring on the page`, ring, page, NON_TEXT],
				[`${picked} in ${scheme}: white on its fill`, "#ffffff", primary, TEXT],
			]).concat(
				scheme === "dark" && contrast(primary, page) >= TEXT ? [`${picked} in dark: its fill reads as text`] : [],
			);
		});
	});

	expect(missed).toEqual([]);
});

/** The custom block reads the shades `customAccent` writes, by the names it writes them under. */
it("lets the custom block read every shade by the name it is written under", () => {
	const block = /\[data-accent="custom"\]\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? "";
	const read = [...block.matchAll(/var\((--custom-[a-z-]+)/g)].map((match) => match[1]);

	const written = Object.keys(customProperties(customAccent({ r: 0, g: 0, b: 0 })));

	expect(new Set(read)).toEqual(new Set(written));
});
