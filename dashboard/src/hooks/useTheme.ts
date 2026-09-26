import { type Preference, useRootPreference } from "@/hooks/rootPreference";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** `system` removes the attribute, so `color-scheme: light dark` follows the browser before any script runs. */
export const THEME: Preference<Theme> = {
	attribute: "data-theme",
	storageKey: "testify:theme",
	options: THEMES,
	fallback: "system",
};

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
	const { value, choose } = useRootPreference(THEME);

	return { theme: value, setTheme: choose };
}
