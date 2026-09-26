/** Colour, boxes and step lines for what a person reads in a terminal; logging stays in `logger.ts`. */

interface ColourTarget {
	isTTY?: boolean;
}

/**
 * `NO_COLOR` and `FORCE_COLOR` are the terminal's own conventions rather than the bot's configuration, and
 * `FORCE_COLOR` is how `npm run dev:all` keeps colour through the pipe it reads each half from.
 */
export function colourEnabled(
	stream: ColourTarget = process.stdout,
	env: Record<string, string | undefined> = process.env,
): boolean {
	if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
	if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== "0" && env.FORCE_COLOR !== "false";
	if (env.TERM === "dumb") return false;

	return stream.isTTY === true;
}

const CODES = {
	bold: [1, 22],
	dim: [2, 22],
	italic: [3, 23],
	underline: [4, 24],
	red: [31, 39],
	green: [32, 39],
	yellow: [33, 39],
	blue: [34, 39],
	magenta: [35, 39],
	cyan: [36, 39],
	grey: [90, 39],
	pink: ["38;5;213", 39],
	orange: ["38;5;214", 39],
	onRed: [41, 49],
	onGreen: [42, 49],
	onYellow: [43, 49],
	onBlue: [44, 49],
	onMagenta: [45, 49],
} as const;

export type StyleName = keyof typeof CODES;
export type Paint = Record<StyleName, (text: string) => string>;

/** Every style as a function, which returns its input untouched when colour is off. */
export function painter(enabled: boolean = colourEnabled()): Paint {
	return Object.fromEntries(
		Object.entries(CODES).map(([name, [open, close]]) => [
			name,
			(text: string) => (enabled ? `\u001b[${String(open)}m${text}\u001b[${String(close)}m` : text),
		]),
	) as Paint;
}

// eslint-disable-next-line no-control-regex -- the escape character is exactly what this strips.
const ANSI = /\u001b\[[0-9;]*m/g;

const WIDE = /\p{Emoji_Presentation}/u;
const ZERO_WIDTH = /^(?:\p{M}|\u200d)$/u;

/** Columns a string takes once its colour codes are gone: emoji are two wide, arrows and ticks one. */
export function visibleWidth(text: string): number {
	let width = 0;
	for (const character of text.replace(ANSI, "")) {
		if (ZERO_WIDTH.test(character)) continue;
		width += WIDE.test(character) ? 2 : 1;
	}
	return width;
}

export type Tone = "info" | "success" | "warning" | "error";

const TONE_STYLE: Record<Tone, StyleName> = { info: "cyan", success: "green", warning: "yellow", error: "red" };
const TONE_BADGE: Record<Tone, StyleName> = { info: "onBlue", success: "onGreen", warning: "onYellow", error: "onRed" };

/** A rounded box with a coloured border, and a title set into its top edge when there is one. */
export function box(title: string, body: string[], tone: Tone, paint: Paint = painter()): string[] {
	const border = paint[TONE_STYLE[tone]];
	const width = Math.max(visibleWidth(title) + 4, ...body.map(visibleWidth)) + 2;
	const rest = "─".repeat(Math.max(0, width - visibleWidth(title) - 3));
	const top =
		title === ""
			? border(`╭${"─".repeat(width)}╮`)
			: `${border("╭─ ")}${paint.bold(border(title))}${border(` ${rest}╮`)}`;

	return [
		top,
		border(`│${" ".repeat(width)}│`),
		...body.map((line) => `${border("│")} ${line}${" ".repeat(width - visibleWidth(line) - 1)}${border("│")}`),
		border(`│${" ".repeat(width)}│`),
		border(`╰${"─".repeat(width)}╯`),
	];
}

/** A short label on a coloured background, such as ` ERROR ` at the start of a failure. */
export function badge(label: string, tone: Tone, paint: Paint = painter()): string {
	return paint.bold(paint[TONE_BADGE[tone]](` ${label} `));
}

export type StepState = "done" | "working" | "skipped" | "warning" | "failed";

const STEP_GLYPH: Record<StepState, [string, StyleName]> = {
	done: ["✔", "green"],
	working: ["◌", "cyan"],
	skipped: ["○", "grey"],
	warning: ["▲", "yellow"],
	failed: ["✖", "red"],
};

/** One line of start-up progress: a glyph, a fixed-width label, what happened and, dimmed, how long it took. */
export function stepLine(state: StepState, label: string, detail: string, ms?: number, paint = painter()): string {
	const [glyph, style] = STEP_GLYPH[state];
	const timing = ms === undefined ? "" : paint.dim(` ${formatMs(ms)}`);

	return `  ${paint[style](glyph)} ${paint.bold(label.padEnd(12))}${detail}${timing}`;
}

function formatMs(ms: number): string {
	return ms < 1_000 ? `${String(Math.round(ms))}ms` : `${(ms / 1_000).toFixed(1)}s`;
}
