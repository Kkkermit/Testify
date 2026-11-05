import { useEffect } from "react";

export function useQuickSearchShortcut(onToggle: () => void): void {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
				return;
			// Browsers take Ctrl+K for their own search box otherwise.
			event.preventDefault();
			onToggle();
		};

		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [onToggle]);
}
