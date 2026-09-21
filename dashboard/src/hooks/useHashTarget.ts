import { useEffect } from "react";
import { useLocation } from "react-router";
import { prefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Brings the element a URL fragment names into view and puts focus on it, so a deep link lands a reader where it promised. */
export function useHashTarget(): void {
	const { hash, key } = useLocation();

	useEffect(() => {
		if (hash === "") return;

		// The target needs `tabIndex={-1}`; without it focus stays in the sidebar and only the page moves, so a
		// screen reader is still reading the top of the page while the setting is on screen.
		const target = document.getElementById(hash.slice(1));
		if (target === null) return;

		target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
		target.focus({ preventScroll: true });
		// `key` is in the dependencies rather than the body: React Router mints a fresh one on every navigation,
		// including a repeat click of the link already in the address bar, which is the only way that click moves
		// anybody anywhere.
	}, [hash, key]);
}
