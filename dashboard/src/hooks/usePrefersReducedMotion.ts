import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reads the preference without assuming `matchMedia` exists, which jsdom and older embedded browsers lack.
 *
 * The attribute is checked first and the media query second, in the same order the stylesheet resolves them,
 * so JavaScript-driven motion and CSS motion can never end up in different states.
 */
export function prefersReducedMotion(): boolean {
	if (typeof document !== "undefined") {
		const chosen = document.documentElement.getAttribute("data-motion");
		if (chosen === "reduced") return true;
		if (chosen === "full") return false;
	}

	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia(QUERY).matches;
}

/** CSS already flattens every transition, but WebGL and JS-driven animation never reach a stylesheet, so they have to ask. */
export function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(prefersReducedMotion);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const onChange = (): void => {
			setReduced(prefersReducedMotion());
		};

		const media = typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null;
		media?.addEventListener("change", onChange);

		// The choice is watched on the element itself rather than through a store, so a reader changing it on
		// the appearance page reaches the backdrop without either side holding its own copy of the answer.
		const observer = new MutationObserver(onChange);
		observer.observe(document.documentElement, { attributeFilter: ["data-motion"] });

		onChange();
		return () => {
			media?.removeEventListener("change", onChange);
			observer.disconnect();
		};
	}, []);

	return reduced;
}
