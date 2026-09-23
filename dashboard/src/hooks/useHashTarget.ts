import { useEffect } from "react";
import { useLocation } from "react-router";
import { prefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Brings the element a URL fragment names into view and puts focus on it, so a deep link lands a reader where it promised. */
export function useHashTarget(): void {
	const { hash, key } = useLocation();

	useEffect(() => {
		if (hash === "") return;

		// The target needs `tabIndex={-1}`, or focus stays in the sidebar while the page scrolls.
		const target = document.getElementById(hash.slice(1));
		if (target === null) return;

		target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
		target.focus({ preventScroll: true });
		// `key` changes on every navigation, including a repeat click of the current link.
	}, [hash, key]);
}
