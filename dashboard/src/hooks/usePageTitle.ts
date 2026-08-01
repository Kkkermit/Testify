import { useEffect } from "react";

/**
 * Set on every route. A screen-reader user navigating by tab title needs it, and it is what makes browser
 * history usable rather than fourteen entries all called "Testify".
 *
 * The server's name goes in the middle, so two tabs open on the same screen in different servers are told apart.
 */
export function pageTitle(title: string, context?: string): string {
	return [title, context, "Testify"].filter((part) => part !== undefined && part !== "").join(" · ");
}

export function usePageTitle(title: string, context?: string): void {
	useEffect(() => {
		document.title = pageTitle(title, context);
	}, [title, context]);
}
