/** The colour palette offered by `/announce`, `/create embed` and friends. */
export const COLOUR_CHOICES = [
	{ name: "Aqua", value: "#00ffff" },
	{ name: "Blurple", value: "#7289da" },
	{ name: "Blue", value: "#0000ff" },
	{ name: "Fuchsia", value: "#ff00ff" },
	{ name: "Gold", value: "#ffd700" },
	{ name: "Green", value: "#008000" },
	{ name: "Grey", value: "#808080" },
	{ name: "Navy", value: "#000080" },
	{ name: "Orange", value: "#ffa500" },
	{ name: "Pink", value: "#ff007f" },
	{ name: "Purple", value: "#800080" },
	{ name: "Red", value: "#ff0000" },
	{ name: "White", value: "#ffffff" },
	{ name: "Yellow", value: "#ffff00" },
];

const HEX = /^#[0-9a-f]{6}$/i;

export function resolveColour(input: string | null, fallback = "#7289da"): `#${string}` {
	if (input !== null && HEX.test(input)) return input.toLowerCase() as `#${string}`;
	return fallback as `#${string}`;
}
