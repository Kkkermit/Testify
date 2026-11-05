import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Checks the attribute before the media query, as the stylesheet does, and survives a missing `matchMedia`. */
export function prefersReducedMotion(): boolean {
	if (typeof document !== "undefined") {
		const chosen = document.documentElement.getAttribute("data-motion");
		if (chosen === "reduced") return true;
		if (chosen === "full") return false;
	}

	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia(QUERY).matches;
}

/** CSS flattens transitions on its own; animation driven from script has to ask. */
export function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(prefersReducedMotion);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const onChange = (): void => {
			setReduced(prefersReducedMotion());
		};

		const media = typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null;
		media?.addEventListener("change", onChange);

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
