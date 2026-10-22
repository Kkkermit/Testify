import { i18next, type TranslationKey } from "@/i18n";
import { themeColour } from "@/lib/three/tokens";

/** What somebody who opens DevTools reads first: a welcome, where to report a bug, and a warning against pasting code. */

/** One `console.log` call: text with a `%c` before each styled run, and those styles in the same order. */
export interface ConsoleLine {
	text: string;
	styles: string[];
}

export interface ConsolePalette {
	brand: string;
	danger: string;
}

type Translate = (key: TranslationKey) => string;

const BODY = "font-size:13px;line-height:1.6";
const BOLD = `${BODY};font-weight:700`;
const LEAD = "font-size:15px;line-height:1.6;font-weight:700";

/** A filled label with white text rather than coloured text, so it reads on DevTools' light and dark themes alike. */
function label(fill: string, size: number): string {
	return `background:${fill};color:white;font-weight:700;font-size:${String(size)}px;padding:4px 10px;border-radius:6px`;
}

/** The console reads `%c`, `%s` and the like as format codes, so a bot named `100%cool` must not become a style. */
function literal(text: string): string {
	return text.replaceAll("%", "%%");
}

export function greetingLines(t: Translate, palette: ConsolePalette): ConsoleLine[] {
	return [
		{ text: `%c${literal(t("devConsole.title"))}`, styles: [label(palette.brand, 18)] },
		{ text: `%c${literal(t("devConsole.welcome"))}`, styles: [BODY] },
		{
			text: `%c${literal(t("devConsole.bugsLead"))}%c ${literal(t("devConsole.bugsBody"))}`,
			styles: [BOLD, BODY],
		},
		{ text: `\n%c${literal(t("devConsole.stopTitle"))}`, styles: [label(palette.danger, 28)] },
		{ text: `%c${literal(t("devConsole.stopLead"))}`, styles: [LEAD] },
		{ text: `%c${literal(t("devConsole.stopBody"))}`, styles: [BODY] },
	];
}

export function printGreeting(lines: ConsoleLine[]): void {
	for (const line of lines) console.log(line.text, ...line.styles);
}

/** Waits for the reader's dictionary, so the warning arrives in the language the rest of the page is in. */
export function greetTheConsole(): void {
	const greet = (): void => {
		const palette = {
			brand: themeColour("--color-primary", "#7c3aed"),
			danger: themeColour("--color-destructive", "#dc2626"),
		};
		printGreeting(greetingLines((key) => i18next.t(key), palette));
	};

	if (i18next.isInitialized) greet();
	else i18next.on("initialized", greet);
}
