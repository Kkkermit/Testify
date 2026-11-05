import { useCallback, useState } from "react";
import { type Preference, storedPreference, useRootPreference } from "@/hooks/rootPreference";
import { readHex, toHex } from "@/lib/colour";
import { customAccent, customProperties } from "@/lib/customAccent";

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

export const CUSTOM_COLOUR_KEY = "testify:accent-colour";

export function storedCustomColour(): string | null {
	try {
		const colour = readHex(window.localStorage.getItem(CUSTOM_COLOUR_KEY));
		return colour === null ? null : toHex(colour);
	} catch {
		return null;
	}
}

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

/** False when it was not a colour, and nothing changed. */
export function useCustomColour(): { colour: string | null; setColour: (value: string) => boolean } {
	const [colour, setState] = useState<string | null>(storedCustomColour);

	const setColour = useCallback((value: string) => {
		// Only a colour reaches the page or storage, whatever string arrives.
		const read = readHex(value);
		if (read === null) return false;

		const hex = toHex(read);
		applyCustomColour(hex);
		setState(hex);
		try {
			window.localStorage.setItem(CUSTOM_COLOUR_KEY, hex);
		} catch {
			// A colour that cannot be remembered is still worth wearing for this visit.
		}
		return true;
	}, []);

	return { colour, setColour };
}
