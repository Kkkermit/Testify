import { type Preference, useRootPreference } from "@/hooks/rootPreference";

export const MOTIONS = ["system", "full", "reduced"] as const;
export type Motion = (typeof MOTIONS)[number];

/** The choice wins in both directions over the system preference. */
export const MOTION: Preference<Motion> = {
	attribute: "data-motion",
	storageKey: "testify:motion",
	options: MOTIONS,
	fallback: "system",
};

export function useMotion(): { motion: Motion; setMotion: (next: Motion) => void } {
	const { value, choose } = useRootPreference(MOTION);

	return { motion: value, setMotion: choose };
}
