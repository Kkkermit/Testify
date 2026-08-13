import { applyPreference, type Preference, storedPreference, useRootPreference } from "@/hooks/rootPreference";

export const MOTIONS = ["system", "full", "reduced"] as const;
export type Motion = (typeof MOTIONS)[number];

/**
 * The choice wins in both directions: `reduced` stills the page on a machine whose system says nothing, and
 * `full` restores it for somebody who set the system preference for a different application.
 */
export const MOTION: Preference<Motion> = {
	attribute: "data-motion",
	storageKey: "testify:motion",
	options: MOTIONS,
	fallback: "system",
};

export function storedMotion(): Motion {
	return storedPreference(MOTION);
}

export function applyMotion(motion: Motion): void {
	applyPreference(MOTION, motion);
}

export function useMotion(): { motion: Motion; setMotion: (next: Motion) => void } {
	const { value, choose } = useRootPreference(MOTION);

	return { motion: value, setMotion: choose };
}
