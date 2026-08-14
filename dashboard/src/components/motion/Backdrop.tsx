import { useEffect, useRef } from "react";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { type Starfield } from "@/lib/three/starfield";

/** WebGL is absent in jsdom, on locked-down machines, and behind some remote desktops. */
export function supportsWebgl(): boolean {
	if (typeof document === "undefined") return false;

	try {
		return document.createElement("canvas").getContext("webgl2") !== null;
	} catch {
		return false;
	}
}

/** three.js is imported dynamically so it lands in its own chunk and is never fetched by a browser that would not draw it. */
export function Backdrop({ opacity }: { opacity?: number } = {}): React.JSX.Element | null {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fieldRef = useRef<Starfield | null>(null);
	const reduced = usePrefersReducedMotion();
	const visible = useDocumentVisible();
	const wanted = !reduced && supportsWebgl();

	useEffect(() => {
		if (!wanted) return;

		const canvas = canvasRef.current;
		if (canvas === null) return;

		let cancelled = false;

		void import("@/lib/three/starfield").then(({ createStarfield }) => {
			if (cancelled) return;
			fieldRef.current = createStarfield(canvas, opacity === undefined ? {} : { opacity });
		});

		return () => {
			cancelled = true;
			fieldRef.current?.dispose();
			fieldRef.current = null;
		};
	}, [wanted, opacity]);

	useEffect(() => {
		fieldRef.current?.setRunning(visible);
	}, [visible]);

	useEffect(() => {
		if (!wanted) return;

		const repaint = (): void => {
			fieldRef.current?.refresh();
		};

		// The palette is chosen on the appearance page and the device can change it underneath, so the field is
		// told to re-read rather than holding the colour it happened to start with.
		const observer = new MutationObserver(repaint);
		observer.observe(document.documentElement, { attributeFilter: ["data-theme", "data-accent"] });

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		media.addEventListener("change", repaint);

		return () => {
			observer.disconnect();
			media.removeEventListener("change", repaint);
		};
	}, [wanted]);

	if (!wanted) return null;

	return (
		<canvas
			ref={canvasRef}
			aria-hidden="true"
			// Behind everything and untouchable, so it can never intercept a click meant for a control.
			className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
		/>
	);
}
