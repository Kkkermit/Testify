import { EMBED_COLOURS } from "@testify/shared";

/** The colour palette offered by `/announce`, `/create embed` and the dashboard's composer alike. */
export const COLOUR_CHOICES = EMBED_COLOURS.map((colour) => ({ name: colour.name, value: colour.value }));

const HEX = /^#[0-9a-f]{6}$/i;

export function resolveColour(input: string | null, fallback = "#7289da"): `#${string}` {
	if (input !== null && HEX.test(input)) return input.toLowerCase() as `#${string}`;
	return fallback as `#${string}`;
}
