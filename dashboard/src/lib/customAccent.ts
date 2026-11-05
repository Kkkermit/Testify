import { fromHsl, type Hsl, luminance, type Rgb, toHex, toHsl } from "@/lib/colour";

export const CUSTOM_STARTING_POINT = "#8a2a6b";

export interface AccentShades {
	readonly primary: string;
	readonly accent: string;
	readonly wash: string;
}

export interface CustomAccent {
	readonly light: AccentShades;
	readonly dark: AccentShades;
}

type Band = readonly [low: number, high: number];

/** Each token's luminance band, inside every threshold a preset is held to; `contrast.test.ts` sweeps the colour space through it. */
const BANDS: Record<"light" | "dark", Record<keyof AccentShades, Band>> = {
	light: { primary: [0, 0.17], accent: [0, 0.15], wash: [0.87, 0.93] },
	dark: { primary: [0.152, 0.175], accent: [0.3, 1], wash: [0.016, 0.025] },
};

const WASH_SATURATION: Record<"light" | "dark", number> = { light: 0.55, dark: 0.3 };

function fit(colour: Hsl, [low, high]: Band): Rgb {
	const at = (l: number): Rgb => fromHsl({ ...colour, l });
	const now = at(colour.l);
	const shade = luminance(now);
	if (shade >= low && shade <= high) return now;

	// At a fixed hue and saturation luminance only rises with lightness, so halving finds the edge of the band.
	const target = shade < low ? low : high;
	let [below, above] = [0, 1];
	for (let step = 0; step < 24; step++) {
		const middle = (below + above) / 2;
		if (luminance(at(middle)) < target) below = middle;
		else above = middle;
	}

	return shade < low ? at(above) : at(below);
}

function shades(colour: Hsl, scheme: "light" | "dark"): AccentShades {
	const band = BANDS[scheme];
	const wash = { ...colour, s: Math.min(colour.s, WASH_SATURATION[scheme]) };

	return {
		primary: toHex(fit(colour, band.primary)),
		accent: toHex(fit(colour, band.accent)),
		wash: toHex(fit(wash, band.wash)),
	};
}

export function customAccent(colour: Rgb): CustomAccent {
	const hsl = toHsl(colour);
	return { light: shades(hsl, "light"), dark: shades(hsl, "dark") };
}

export function customProperties({ light, dark }: CustomAccent): Record<string, string> {
	return {
		"--custom-primary-light": light.primary,
		"--custom-primary-dark": dark.primary,
		"--custom-accent-light": light.accent,
		"--custom-accent-dark": dark.accent,
		"--custom-wash-light": light.wash,
		"--custom-wash-dark": dark.wash,
	};
}
