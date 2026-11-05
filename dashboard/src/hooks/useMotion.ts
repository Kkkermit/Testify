import { type Preference, useRootPreference } from "@/hooks/rootPreference";

export const MOTIONS = ["system", "full", "reduced"] as const;
export type Motion = (typeof MOTIONS)[number];

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
