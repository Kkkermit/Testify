import { useEffect } from "react";

export function useQuickSearchShortcut(onToggle: () => void): void {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent): void => {
			// Autofill and some extensions send a keydown with no key at all, whatever the type says.
			const key: unknown = event.key;
			if (typeof key !== "string" || key.toLowerCase() !== "k") return;
			if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
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
