import { useEffect } from "react";

/**
 * Set on every route, or browser history is fourteen entries all called "Testify". The server's name goes in the
 * middle, so two tabs on the same screen in different servers are told apart.
 */
export function pageTitle(title: string, context?: string): string {
	return [title, context, "Testify"].filter((part) => part !== undefined && part !== "").join(" · ");
}

export function usePageTitle(title: string, context?: string): void {
	useEffect(() => {
		document.title = pageTitle(title, context);
	}, [title, context]);
}
