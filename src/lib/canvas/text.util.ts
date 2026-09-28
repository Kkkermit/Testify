import { readdirSync } from "node:fs";
import { GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { assetPath } from "@core/paths";

/** Text on a card, in bundled fonts, falling back character by character to whatever the host has installed. */

export const SANS = "Card Sans";
export const DISPLAY = "Card Display";

type Family = typeof SANS | typeof DISPLAY;
export type Weight = 500 | 600 | 700;

export interface TextStyle {
	size: number;
	colour: string;
	weight?: Weight;
	family?: Family;
}

export interface DrawOptions extends TextStyle {
	align?: "left" | "center" | "right";
	/** Past this width the text shrinks towards `minSize`, then ends in an ellipsis. */
	maxWidth?: number;
	minSize?: number;
}

/** Each bundled file covers one script, so a family is a chain of them. */
const BUNDLED: Record<Family, string[]> = {
	[SANS]: [SANS, `${SANS} Ext`, `${SANS} Cyrillic`],
	[DISPLAY]: [DISPLAY, `${DISPLAY} Ext`, SANS, `${SANS} Ext`, `${SANS} Cyrillic`],
};

const FILE_FAMILIES: [RegExp, string][] = [
	[/^inter-latin-\d+/, SANS],
	[/^inter-latin-ext-\d+/, `${SANS} Ext`],
	[/^inter-cyrillic-\d+/, `${SANS} Cyrillic`],
	[/^space-grotesk-latin-\d+/, DISPLAY],
	[/^space-grotesk-latin-ext-\d+/, `${DISPLAY} Ext`],
];

// Colour emoji first for pictographs, so a heart is drawn as an emoji rather than as a symbol-font outline.
const EMOJI_FONTS = ["Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla"];
const SYSTEM_FONTS = [
	"Segoe UI",
	"Segoe UI Symbol",
	"Yu Gothic UI",
	"Meiryo",
	"Malgun Gothic",
	"Microsoft YaHei",
	"Nirmala UI",
	"Hiragino Sans",
	"PingFang SC",
	"Apple SD Gothic Neo",
	"Noto Sans",
	"Noto Sans CJK JP",
	"Noto Sans JP",
	"IPAGothic",
	"WenQuanYi Zen Hei",
	"DejaVu Sans",
	"FreeSans",
	"Arial Unicode MS",
	"Unifont",
];

let registered = false;
let installed: { emoji: string[]; other: string[] } | null = null;

/** Registers the bundled fonts once; a missing folder leaves the system fonts to do the work. */
export function registerCardFonts(directory = assetPath("fonts")): void {
	if (registered) return;
	registered = true;

	let files: string[];
	try {
		files = readdirSync(directory).filter((file) => file.endsWith(".woff2"));
	} catch {
		return;
	}

	for (const file of files) {
		// The longest pattern wins, so `latin-ext` is not read as `latin`.
		const match = FILE_FAMILIES.filter(([pattern]) => pattern.test(file)).sort(
			(a, b) => b[0].source.length - a[0].source.length,
		)[0];
		if (match !== undefined) GlobalFonts.registerFromPath(`${directory}/${file}`, match[1]);
	}
}

function systemFonts(): { emoji: string[]; other: string[] } {
	installed ??= {
		emoji: EMOJI_FONTS.filter((family) => GlobalFonts.has(family)),
		other: SYSTEM_FONTS.filter((family) => GlobalFonts.has(family)),
	};
	return installed;
}

/** What a user sees as one character — a flag or a family emoji is one cluster of several code points. */
export function clusters(text: string): string[] {
	return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map((part) => part.segment);
}

/** Joiners, variation selectors and tag characters shape their neighbours and have no glyph of their own. */
function shapes(point: string): boolean {
	const code = point.codePointAt(0) ?? 0;
	return code === 0x200d || code === 0xfe0e || code === 0xfe0f || (code >= 0xe0020 && code <= 0xe007f);
}
/** Flags, keycaps and anything asking for emoji presentation belong to an emoji font before a symbol font. */
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3|\ufe0f/u;

function fontString(family: string, size: number, weight: Weight): string {
	return `${weight} ${size}px "${family}"`;
}

const coverage = new Map<string, boolean>();
const missingGlyph = new Map<string, string>();

function signature(ctx: SKRSContext2D, text: string): string {
	const metrics = ctx.measureText(text);
	return [
		metrics.width,
		metrics.actualBoundingBoxLeft,
		metrics.actualBoundingBoxRight,
		metrics.actualBoundingBoxAscent,
		metrics.actualBoundingBoxDescent,
	]
		.map((value) => value.toFixed(2))
		.join(",");
}

/** A character the font lacks measures exactly like U+FFFF, which no font draws. */
export function fontCovers(ctx: SKRSContext2D, family: string, cluster: string): boolean {
	const key = `${family}\u0000${cluster}`;
	const known = coverage.get(key);
	if (known !== undefined) return known;

	ctx.save();
	ctx.font = fontString(family, 48, 500);
	let missing = missingGlyph.get(family);
	if (missing === undefined) {
		missing = signature(ctx, "￿");
		missingGlyph.set(family, missing);
	}

	const found = [...cluster].filter((point) => !shapes(point)).every((point) => signature(ctx, point) !== missing);
	ctx.restore();

	coverage.set(key, found);
	return found;
}

export interface Run {
	text: string;
	family: string;
}

/** Groups neighbouring characters that the same font can draw, trying the bundled chain before the system's. */
export function textRuns(
	text: string,
	family: Family,
	covers: (family: string, cluster: string) => boolean,
	system: { emoji: string[]; other: string[] },
): Run[] {
	const runs: Run[] = [];

	for (const cluster of clusters(text)) {
		const chain = EMOJI.test(cluster)
			? [...system.emoji, ...BUNDLED[family], ...system.other]
			: [...BUNDLED[family], ...system.other, ...system.emoji];
		const chosen = chain.find((candidate) => covers(candidate, cluster)) ?? family;
		const last = runs.at(-1);

		if (last?.family === chosen) last.text += cluster;
		else runs.push({ text: cluster, family: chosen });
	}

	return runs;
}

function layout(ctx: SKRSContext2D, text: string, style: TextStyle, size: number): (Run & { width: number })[] {
	registerCardFonts();
	const weight = style.weight ?? 500;
	const runs = textRuns(
		text,
		style.family ?? SANS,
		(family, cluster) => fontCovers(ctx, family, cluster),
		systemFonts(),
	);

	return runs.map((run) => {
		ctx.font = fontString(run.family, size, weight);
		return { ...run, width: ctx.measureText(run.text).width };
	});
}

function totalWidth(runs: { width: number }[]): number {
	return runs.reduce((sum, run) => sum + run.width, 0);
}

export function measureText(ctx: SKRSContext2D, text: string, style: TextStyle): number {
	ctx.save();
	const width = totalWidth(layout(ctx, text, style, style.size));
	ctx.restore();
	return width;
}

/** Cuts whole characters off the end until the text and an ellipsis fit. */
function ellipsize(ctx: SKRSContext2D, text: string, style: TextStyle, size: number, maxWidth: number): string {
	const parts = clusters(text);

	for (let keep = parts.length - 1; keep > 0; keep -= 1) {
		const candidate = `${parts.slice(0, keep).join("").trimEnd()}…`;
		if (totalWidth(layout(ctx, candidate, style, size)) <= maxWidth) return candidate;
	}

	return "…";
}

/** Draws text at a middle baseline and returns the width it took. */
export function drawText(ctx: SKRSContext2D, text: string, x: number, y: number, options: DrawOptions): number {
	ctx.save();
	const weight = options.weight ?? 500;
	let size = options.size;
	let runs = layout(ctx, text, options, size);

	if (options.maxWidth !== undefined) {
		const floor = options.minSize ?? size;
		while (totalWidth(runs) > options.maxWidth && size > floor) {
			size -= 1;
			runs = layout(ctx, text, options, size);
		}
		if (totalWidth(runs) > options.maxWidth) {
			runs = layout(ctx, ellipsize(ctx, text, options, size, options.maxWidth), options, size);
		}
	}

	const width = totalWidth(runs);
	let cursor = options.align === "right" ? x - width : options.align === "center" ? x - width / 2 : x;

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = options.colour;
	for (const run of runs) {
		ctx.font = fontString(run.family, size, weight);
		ctx.fillText(run.text, cursor, y);
		cursor += run.width;
	}

	ctx.restore();
	return width;
}
