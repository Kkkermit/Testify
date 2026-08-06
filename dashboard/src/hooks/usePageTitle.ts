import { useEffect } from "react";

/** Set on every route, or history is fourteen entries all called "Testify"; the server name tells two tabs on the same screen apart. */
export function pageTitle(title: string, context?: string): string {
	return [title, context, "Testify"].filter((part) => part !== undefined && part !== "").join(" · ");
}

export function usePageTitle(title: string, context?: string): void {
	useEffect(() => {
		document.title = pageTitle(title, context);
	}, [title, context]);
}
