/** WebGL takes numbers, not class names, so this is the one place a colour is read rather than applied — and it is read off `:root`. */
export function cssColour(name: string, fallback: string, root: Element = document.documentElement): string {
	const value = getComputedStyle(root).getPropertyValue(name).trim();
	return value === "" ? fallback : value;
}

/** three's Color parses `#rgb` and `#rrggbb`, so anything else from a token is refused before it reaches it. */
export function isHexColour(value: string): boolean {
	return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

/**
 * A custom property is never resolved by `getComputedStyle`, so a `light-dark()` token arrives here as its own
 * source text rather than as the colour the page is painted with. Picking the half by hand is what keeps the
 * backdrop on the same palette as everything else instead of silently falling back.
 */
export function pickScheme(value: string, dark: boolean): string {
	const both = /^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i.exec(value);
	if (both?.[1] === undefined || both[2] === undefined) return value;

	return dark ? both[2] : both[1];
}

/** `color-scheme` is `light dark` until somebody chooses, and then the browser's own preference decides. */
export function prefersDark(root: Element = document.documentElement): boolean {
	const scheme = getComputedStyle(root).colorScheme.trim();
	if (scheme === "dark") return true;
	if (scheme === "light") return false;

	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function accentColour(root?: Element): string {
	const value = pickScheme(cssColour("--color-accent", "#a78bfa", root), prefersDark(root));
	return isHexColour(value) ? value : "#a78bfa";
}
