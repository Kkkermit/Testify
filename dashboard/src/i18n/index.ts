import i18next, { type ParseKeys } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en.json";
import { BUILT_IN_BOT_NAME } from "@/lib/brand";
import { formatNumber } from "@/lib/intl";

/** Every key English defines. A nav entry or a component naming one that is not there fails the build. */
export type TranslationKey = ParseKeys<"translation">;

export const LOCALES = ["en", "de", "es", "fr", "it", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

/** Endonyms: somebody looking for their own language is looking for the word they call it by. */
export const LOCALE_NAMES: Record<Locale, string> = {
	en: "English",
	de: "Deutsch",
	es: "Español",
	fr: "Français",
	it: "Italiano",
	ru: "Русский",
};

const LOCALE_STORAGE_KEY = "testify:locale";

const BOT_NAMED = "botNamed";

export function isLocale(value: unknown): value is Locale {
	return LOCALES.some((locale) => locale === value);
}

/** A browser's language as a tag `Intl` accepts: Chromium on a POSIX host reports `en-US@posix`, which throws. */
export function readableTag(language: string): string {
	const tag = language.split("@")[0]?.replace(/_/g, "-") ?? "";
	try {
		return Intl.getCanonicalLocales(tag)[0] ?? "en";
	} catch {
		return "en";
	}
}

/** English is bundled as the fallback; the other languages load only when chosen. */
const lazyDictionaries = resourcesToBackend(
	async (language: string) => (await import(`./locales/${language}.json`)) as { default: Record<string, unknown> },
);

void i18next
	.use(lazyDictionaries)
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: { en: { translation: en } },
		// The bundled English stays authoritative while a lazy dictionary is still in flight.
		partialBundledLanguages: true,
		fallbackLng: "en",
		supportedLngs: [...LOCALES],
		// `es-419` and `de-AT` should get Spanish and German rather than falling through to English.
		nonExplicitSupportedLngs: true,
		detection: {
			order: ["localStorage", "navigator"],
			lookupLocalStorage: LOCALE_STORAGE_KEY,
			caches: ["localStorage"],
			convertDetectedLanguage: readableTag,
		},
		interpolation: {
			// React escapes before anything reaches the DOM, and escaping twice mangles an apostrophe.
			escapeValue: false,
			// `{{bot}}` in any string is the bot's own name, so a renamed or forked bot is always called by its own name.
			defaultVariables: { bot: BUILT_IN_BOT_NAME },
		},
		react: { bindI18n: `languageChanged ${BOT_NAMED}` },
	});

/** The name `{{bot}}` fills in: the one `/api/bot` reports once it has answered, the one built in from `.env` before. */
export function currentBotName(): string {
	const name: unknown = i18next.options.interpolation?.defaultVariables?.bot;
	return typeof name === "string" ? name : BUILT_IN_BOT_NAME;
}

/** Every `useTranslation` listens for `BOT_NAMED`, so each string naming the bot re-renders with the new name. */
export function nameTheBot(name: string): void {
	const variables = i18next.options.interpolation?.defaultVariables;
	if (variables === undefined || variables.bot === name) return;

	variables.bot = name;
	// A tick later, or a component re-subscribing in the same commit as the answer never hears it.
	queueMicrotask(() => i18next.emit(BOT_NAMED));
}

// `{{count, number}}` is written by the same formatter as every other number, in a locale the browser accepts.
i18next.services.formatter?.add("number", (value: unknown) =>
	typeof value === "number" ? formatNumber(value) : String(value),
);

/** Sets `lang` to the language the page is written in, which i18next does not, so a screen reader reads it in its own voice. */
function markDocumentLanguage(): void {
	document.documentElement.lang = isLocale(i18next.resolvedLanguage) ? i18next.resolvedLanguage : "en";
}

i18next.on("languageChanged", markDocumentLanguage);
if (typeof document !== "undefined") markDocumentLanguage();

export { i18next };
