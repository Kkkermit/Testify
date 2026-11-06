import { BOT_LANGUAGES, type BotLanguage } from "@config/languages";
import { REPLIES, type ReplyKey } from "@config/replies";

/** Which of the bot's languages a Discord locale reads in; anything it does not speak is English. */
export function languageOf(locale: string | null | undefined): BotLanguage {
	const base = (locale ?? "").split("-")[0]?.toLowerCase() ?? "";
	return (BOT_LANGUAGES as readonly string[]).includes(base) ? (base as BotLanguage) : "en";
}

/** A slash command, a button or a form carries the reader's own locale; a prefix command only its server's. */
export function readerLanguage(input: {
	locale?: string | null;
	guild?: { preferredLocale?: string } | null;
}): BotLanguage {
	return languageOf(input.locale ?? input.guild?.preferredLocale);
}

export function say(language: BotLanguage, key: ReplyKey, values: Readonly<Record<string, string>> = {}): string {
	return REPLIES[language][key].replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
}

/** A list joined the way the language joins one, ending in its own word for "or". */
export function eitherOf(language: BotLanguage, items: readonly string[]): string {
	return new Intl.ListFormat(language, { type: "disjunction" }).format(items);
}
