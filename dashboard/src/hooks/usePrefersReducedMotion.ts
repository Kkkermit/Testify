import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Reads the preference without assuming `matchMedia` exists, which jsdom and older embedded browsers lack. */
export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia(QUERY).matches;
}

/** CSS already flattens every transition, but WebGL and JS-driven animation never reach a stylesheet, so they have to ask. */
export function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(prefersReducedMotion);

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

		const media = window.matchMedia(QUERY);
		const onChange = (): void => {
			setReduced(media.matches);
		};

		onChange();
		media.addEventListener("change", onChange);
		return () => {
			media.removeEventListener("change", onChange);
		};
	}, []);

	return reduced;
}
