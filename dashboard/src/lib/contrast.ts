/**
 * WCAG relative luminance and contrast, so the palette can be checked without a browser.
 *
 * `jest-axe` runs with `color-contrast` disabled — jsdom computes no styles, so that rule can only report false
 * negatives there. This is what closes the gap: a pure function over the token values, run in Jest.
 */

function channel(value: number): number {
	return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
	const digits = hex.replace("#", "");
	const [r, g, b] = [0, 2, 4].map((at) => channel(Number.parseInt(digits.slice(at, at + 2), 16) / 255));

	return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function contrast(a: string, b: string): number {
	const [first, second] = [luminance(a), luminance(b)];

	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
