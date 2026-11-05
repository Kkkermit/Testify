export function cssColour(name: string, fallback: string, root: Element = document.documentElement): string {
	const value = getComputedStyle(root).getPropertyValue(name).trim();
	return value === "" ? fallback : value;
}

/** `getComputedStyle` returns a `light-dark()` token as source text, so the half is picked by hand. */
export function pickScheme(value: string, dark: boolean): string {
	const both = /^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i.exec(value);
	if (both?.[1] === undefined || both[2] === undefined) return value;

	return dark ? both[2] : both[1];
}

/** `color-scheme` is `light dark` until somebody chooses, and then the browser's own preference decides. */
function prefersDark(root: Element = document.documentElement): boolean {
	const scheme = getComputedStyle(root).colorScheme.trim();
	if (scheme === "dark") return true;
	if (scheme === "light") return false;

	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function themeColour(name: string, fallback: string, root?: Element): string {
	return pickScheme(cssColour(name, fallback, root), prefersDark(root));
}
