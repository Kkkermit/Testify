import { useEffect } from "react";

/**
 * Set on every route. A screen-reader user navigating by tab title needs it, and it is what makes browser
 * history usable rather than fourteen entries all called "Testify".
 */
export function usePageTitle(title: string): void {
	useEffect(() => {
		document.title = `${title} · Testify`;
	}, [title]);
}
