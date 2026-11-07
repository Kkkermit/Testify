import { type SiteInfo } from "@testify/shared";
import { i18next, type TranslationKey } from "@/i18n";
import { api } from "@/lib/api";
import { themeColour } from "@/lib/tokens";

interface ConsoleLine {
	text: string;
	styles: string[];
}

interface ConsolePalette {
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

/** `codeBody` is the sentence naming the repository, worded already, or null when there is none to name. */
export function greetingLines(t: Translate, palette: ConsolePalette, codeBody: string | null = null): ConsoleLine[] {
	return [
		{ text: `%c${literal(t("devConsole.title"))}`, styles: [label(palette.brand, 18)] },
		{ text: `%c${literal(t("devConsole.welcome"))}`, styles: [BODY] },
		{
			text: `%c${literal(t("devConsole.bugsLead"))}%c ${literal(t("devConsole.bugsBody"))}`,
			styles: [BOLD, BODY],
		},
		...(codeBody === null
			? []
			: [{ text: `%c${literal(t("devConsole.codeLead"))}%c ${literal(codeBody)}`, styles: [BOLD, BODY] }]),
		{ text: `\n%c${literal(t("devConsole.stopTitle"))}`, styles: [label(palette.danger, 28)] },
		{ text: `%c${literal(t("devConsole.stopLead"))}`, styles: [LEAD] },
		{ text: `%c${literal(t("devConsole.stopBody"))}`, styles: [BODY] },
	];
}

function printGreeting(lines: ConsoleLine[]): void {
	for (const line of lines) console.log(line.text, ...line.styles);
}

/** The repository this copy says it runs, which a fork sets to its own; the greeting goes out without it on a failure. */
function readRepository(): Promise<string | null> {
	return api.get<SiteInfo>("/site").then(
		(site) => site.repository,
		() => null,
	);
}

export async function greetTheConsole(repository: Promise<string | null> = readRepository()): Promise<void> {
	const loaded = i18next.isInitialized
		? Promise.resolve()
		: new Promise<void>((resolve) => i18next.on("initialized", () => resolve()));
	const [, source] = await Promise.all([loaded, repository]);

	const palette = {
		brand: themeColour("--color-primary", "#8a2a6b"),
		danger: themeColour("--color-destructive", "#dc2626"),
	};
	// Only an address the console turns into a link, so nothing else a server could answer is printed as one.
	const url = source !== null && /^https:\/\/\S+$/.test(source) ? source : null;
	const codeBody = url === null ? null : i18next.t("devConsole.codeBody", { url });
	printGreeting(greetingLines((key) => i18next.t(key), palette, codeBody));
}
