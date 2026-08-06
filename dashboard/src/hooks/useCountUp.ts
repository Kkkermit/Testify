import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Decelerating, so the number lands softly on its final value rather than stopping dead. */
export function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

export function countUpValue(from: number, to: number, progress: number): number {
	return Math.round(from + (to - from) * easeOutCubic(Math.min(1, Math.max(0, progress))));
}

/** Returns the target immediately under reduced motion, and restarts from what is on screen when the target changes mid-flight. */
export function useCountUp(target: number, durationMs = 650): number {
	const reduced = usePrefersReducedMotion();
	const [value, setValue] = useState(reduced ? target : 0);
	const shown = useRef(value);
	shown.current = value;

	useEffect(() => {
		if (reduced || durationMs <= 0) {
			setValue(target);
			return;
		}

		const from = shown.current;
		const started = performance.now();
		let frame = requestAnimationFrame(function step(now: number): void {
			const progress = (now - started) / durationMs;
			setValue(countUpValue(from, target, progress));
			if (progress < 1) frame = requestAnimationFrame(step);
		});

		return () => {
			cancelAnimationFrame(frame);
		};
	}, [target, durationMs, reduced]);

	return value;
}
