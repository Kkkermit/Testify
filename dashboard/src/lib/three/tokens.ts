/** WebGL takes numbers, not class names, so this is the one place a colour is read rather than applied — and it is read off `:root`. */
export function cssColour(name: string, fallback: string, root: Element = document.documentElement): string {
	const value = getComputedStyle(root).getPropertyValue(name).trim();
	return value === "" ? fallback : value;
}

/** three's Color parses `#rgb` and `#rrggbb`, so anything else from a token is refused before it reaches it. */
export function isHexColour(value: string): boolean {
	return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function accentColour(root?: Element): string {
	const value = cssColour("--color-accent", "#a78bfa", root);
	return isHexColour(value) ? value : "#a78bfa";
}
