import { applyPreference, type Preference, storedPreference, useRootPreference } from "@/hooks/rootPreference";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/**
 * `system` removes the attribute instead of setting one, which is what lets the CSS decide: `color-scheme:
 * light dark` on `:root` already follows the browser, so the untouched page is correct before any script runs.
 */
export const THEME: Preference<Theme> = {
	attribute: "data-theme",
	storageKey: "testify:theme",
	options: THEMES,
	fallback: "system",
};

export function storedTheme(): Theme {
	return storedPreference(THEME);
}

export function applyTheme(theme: Theme): void {
	applyPreference(THEME, theme);
}

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
	const { value, choose } = useRootPreference(THEME);

	return { theme: value, setTheme: choose };
}
