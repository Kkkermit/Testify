import { useCallback, useState } from "react";
import { type Preference, storedPreference, useRootPreference } from "@/hooks/rootPreference";
import { readHex, toHex } from "@/lib/colour";
import { customAccent, customProperties } from "@/lib/customAccent";

/** The accents offered as swatches, each a block in `index.css` that `contrast.test.ts` measures. */
export const ACCENTS = [
	"plum",
	"indigo",
	"blue",
	"sky",
	"cyan",
	"teal",
	"emerald",
	"amber",
	"orange",
	"rose",
	"pink",
	"slate",
] as const;
export type PresetAccent = (typeof ACCENTS)[number];
export type Accent = PresetAccent | "custom";

/** Plum is the base palette in `index.css`, so choosing it removes the attribute rather than restating it. */
export const ACCENT: Preference<Accent> = {
	attribute: "data-accent",
	storageKey: "testify:accent",
	options: [...ACCENTS, "custom"],
	fallback: "plum",
};

/** Kept apart from the accent, so choosing a swatch does not forget the colour somebody made. */
export const CUSTOM_COLOUR_KEY = "testify:accent-colour";

export function storedCustomColour(): string | null {
	try {
		const colour = readHex(window.localStorage.getItem(CUSTOM_COLOUR_KEY));
		return colour === null ? null : toHex(colour);
	} catch {
		return null;
	}
}

/** Writes each theme's shades onto the root, where `[data-accent="custom"]` reads them, or clears them. */
export function applyCustomColour(hex: string | null): void {
	const style = document.documentElement.style;
	const colour = readHex(hex);
	const properties = customProperties(customAccent(colour ?? { r: 0, g: 0, b: 0 }));

	for (const [name, value] of Object.entries(properties)) {
		if (colour === null) style.removeProperty(name);
		else style.setProperty(name, value);
	}
}

/** Custom with no colour behind it is plum, which is also what the stylesheet falls back to. */
export function storedAccent(): Accent {
	const accent = storedPreference(ACCENT);
	return accent === "custom" && storedCustomColour() === null ? ACCENT.fallback : accent;
}

export function useAccent(): { accent: Accent; setAccent: (next: Accent) => void } {
	const { value, choose } = useRootPreference(ACCENT);

	return { accent: value === "custom" && storedCustomColour() === null ? ACCENT.fallback : value, setAccent: choose };
}

/** The colour somebody made, remembered and applied; choosing it as the accent is the caller's next step. */
export function useCustomColour(): { colour: string | null; setColour: (hex: string) => void } {
	const [colour, setState] = useState<string | null>(storedCustomColour);

	const setColour = useCallback((hex: string) => {
		applyCustomColour(hex);
		setState(hex);
		try {
			window.localStorage.setItem(CUSTOM_COLOUR_KEY, hex);
		} catch {
			// A colour that cannot be remembered is still worth wearing for this visit.
		}
	}, []);

	return { colour, setColour };
}
