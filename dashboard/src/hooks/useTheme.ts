import { useCallback, useEffect, useState } from "react";
import { oneOf } from "@/lib/oneOf";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

const KEY = "testify:theme";

/**
 * Reading it back out of storage rather than from React state, because the attribute is applied to
 * `document.documentElement` and a second hook elsewhere must not disagree with the first.
 */
export function storedTheme(): Theme {
	try {
		return oneOf(THEMES, window.localStorage.getItem(KEY), "system");
	} catch {
		// Storage throws rather than returning null when cookies are blocked entirely.
		return "system";
	}
}

/**
 * `system` removes the attribute instead of setting one, which is what lets the CSS decide: `color-scheme:
 * light dark` on `:root` already follows the browser, so the untouched page is correct before any script runs.
 */
export function applyTheme(theme: Theme): void {
	const root = document.documentElement;
	if (theme === "system") root.removeAttribute("data-theme");
	else root.setAttribute("data-theme", theme);
}

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
	const [theme, setState] = useState<Theme>(storedTheme);

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	const setTheme = useCallback((next: Theme) => {
		setState(next);
		try {
			window.localStorage.setItem(KEY, next);
		} catch {
			// A theme that cannot be remembered is still worth applying for this visit.
		}
	}, []);

	return { theme, setTheme };
}
