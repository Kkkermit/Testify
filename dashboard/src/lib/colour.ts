export interface Rgb {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

/** Hue in degrees, saturation and lightness from 0 to 1. */
export interface Hsl {
	readonly h: number;
	readonly s: number;
	readonly l: number;
}

/** Longer than any colour written in these formats, so a paste of something else is refused before it is split. */
export const COLOUR_TEXT_MAX = 40;

/** Three digits need their hash, or "255" would be read as a hex code rather than as a number. */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$|^([0-9a-f]{6})$/;
const SEPARATORS = /[\s,/]+/;
/** Every character a hex code, `rgb(…)` or `hsl(…)` can be written with; nothing else is ever read or kept. */
const OUTSIDE_COLOUR = /[^0-9a-z#(),.%/ -]/gi;
const DECIMAL = /^-?\d+(?:\.\d+)?$/;

function clamp(value: number, low: number, high: number): number {
	return Math.min(high, Math.max(low, value));
}

function fromHex(digits: string): Rgb {
	const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
	const [r, g, b] = [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16));

	return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
}

function argumentsOf(text: string, names: readonly string[]): string[] | null {
	const open = text.indexOf("(");
	if (open === -1) return names.includes("") ? text.split(SEPARATORS).filter(Boolean) : null;
	if (!text.endsWith(")") || !names.includes(text.slice(0, open).trim())) return null;

	return text
		.slice(open + 1, -1)
		.split(SEPARATORS)
		.filter(Boolean);
}

function channels(parts: readonly string[], units: readonly string[]): number[] | null {
	if (parts.length !== 3 && parts.length !== 4) return null;
	if (parts.length === 4 && !DECIMAL.test((parts[3] ?? "").replace(/%$/, ""))) return null;

	const numbers = parts.slice(0, 3).map((part, index) => {
		const unit = units[index] ?? "";
		const bare = unit !== "" && part.endsWith(unit) ? part.slice(0, -unit.length) : part;
		return DECIMAL.test(bare) ? Number(bare) : Number.NaN;
	});

	return numbers.some(Number.isNaN) ? null : numbers;
}

function rgbFrom(text: string): Rgb | null {
	const parts = argumentsOf(text, ["rgb", "rgba", ""]);
	const numbers = parts === null ? null : channels(parts, ["", "", ""]);
	if (numbers === null || numbers.some((value) => value < 0 || value > 255)) return null;

	const [r, g, b] = numbers.map(Math.round);
	return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
}

function hslFrom(text: string): Rgb | null {
	const parts = argumentsOf(text, ["hsl", "hsla"]);
	const numbers = parts === null ? null : channels(parts, ["deg", "%", "%"]);
	if (numbers === null) return null;

	const [h = 0, s = 0, l = 0] = numbers;
	if (s < 0 || l < 0 || s > 100 || l > 100) return null;

	return fromHsl({ h, s: s / 100, l: l / 100 });
}

export function sanitiseColourText(input: string): string {
	return input.replace(OUTSIDE_COLOUR, "").slice(0, COLOUR_TEXT_MAX);
}

export function parseColour(input: string): Rgb | null {
	const text = input.trim().toLowerCase();
	if (text === "" || text.length > COLOUR_TEXT_MAX) return null;
	if (new RegExp(OUTSIDE_COLOUR.source, "i").test(text)) return null;

	const hex = HEX.exec(text);
	const digits = hex?.[1] ?? hex?.[2];
	if (digits !== undefined) return fromHex(digits);

	return text.startsWith("hsl") ? hslFrom(text) : rgbFrom(text);
}

/** Only `#rrggbb`, for a value read back from storage, which holds whatever was last written to it. */
export function readHex(value: string | null): Rgb | null {
	return value !== null && /^#[0-9a-f]{6}$/.test(value) ? fromHex(value.slice(1)) : null;
}

export function toHex({ r, g, b }: Rgb): string {
	return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function toRgbText({ r, g, b }: Rgb): string {
	return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
}

export function toHslText(rgb: Rgb): string {
	const { h, s, l } = toHsl(rgb);
	return `hsl(${String(Math.round(h))}, ${String(Math.round(s * 100))}%, ${String(Math.round(l * 100))}%)`;
}

export function toHsl({ r, g, b }: Rgb): Hsl {
	const [red, green, blue] = [r / 255, g / 255, b / 255];
	const high = Math.max(red, green, blue);
	const low = Math.min(red, green, blue);
	const l = (high + low) / 2;
	const chroma = high - low;
	if (chroma === 0) return { h: 0, s: 0, l };

	const s = chroma / (1 - Math.abs(2 * l - 1));
	const sector =
		high === red
			? ((green - blue) / chroma) % 6
			: high === green
				? (blue - red) / chroma + 2
				: (red - green) / chroma + 4;

	return { h: (sector * 60 + 360) % 360, s, l };
}

export function fromHsl({ h, s, l }: Hsl): Rgb {
	const hue = (((h % 360) + 360) % 360) / 60;
	const saturation = clamp(s, 0, 1);
	const lightness = clamp(l, 0, 1);
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const second = chroma * (1 - Math.abs((hue % 2) - 1));
	const base = lightness - chroma / 2;
	const [red, green, blue] =
		hue < 1
			? [chroma, second, 0]
			: hue < 2
				? [second, chroma, 0]
				: hue < 3
					? [0, chroma, second]
					: hue < 4
						? [0, second, chroma]
						: hue < 5
							? [second, 0, chroma]
							: [chroma, 0, second];

	const channel = (value: number): number => clamp(Math.round((value + base) * 255), 0, 255);
	return { r: channel(red), g: channel(green), b: channel(blue) };
}

export function luminance({ r, g, b }: Rgb): number {
	const linear = (value: number): number => {
		const unit = value / 255;
		return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
	};

	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
