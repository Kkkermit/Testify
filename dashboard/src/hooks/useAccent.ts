import { applyPreference, type Preference, storedPreference, useRootPreference } from "@/hooks/rootPreference";

export const ACCENTS = ["violet", "blue", "cyan", "teal", "amber", "pink"] as const;
export type Accent = (typeof ACCENTS)[number];

/** Violet is the base palette in `index.css`, so choosing it removes the attribute rather than restating it. */
export const ACCENT: Preference<Accent> = {
	attribute: "data-accent",
	storageKey: "testify:accent",
	options: ACCENTS,
	fallback: "violet",
};

export function storedAccent(): Accent {
	return storedPreference(ACCENT);
}

export function applyAccent(accent: Accent): void {
	applyPreference(ACCENT, accent);
}

export function useAccent(): { accent: Accent; setAccent: (next: Accent) => void } {
	const { value, choose } = useRootPreference(ACCENT);

	return { accent: value, setAccent: choose };
}
