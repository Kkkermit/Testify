import { BOT_NAME } from "@testify/shared";
import i18next, { type ParseKeys } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en.json";

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

export const LOCALE_STORAGE_KEY = "testify:locale";

const BOT_NAMED = "botNamed";

export function isLocale(value: unknown): value is Locale {
	return LOCALES.some((locale) => locale === value);
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
		},
		interpolation: {
			// React escapes before anything reaches the DOM, and escaping twice mangles an apostrophe.
			escapeValue: false,
			// `{{bot}}` in any string is the bot's own name, so a renamed or forked bot is always called by its own name.
			defaultVariables: { bot: BOT_NAME },
		},
		react: { bindI18n: `languageChanged ${BOT_NAMED}` },
	});

/** The name `{{bot}}` fills in: Discord's own once `/api/bot` has answered, the built-in one before. */
export function currentBotName(): string {
	const name: unknown = i18next.options.interpolation?.defaultVariables?.bot;
	return typeof name === "string" ? name : BOT_NAME;
}

/** Every `useTranslation` listens for `BOT_NAMED`, so each string naming the bot re-renders with the new name. */
export function nameTheBot(name: string): void {
	const variables = i18next.options.interpolation?.defaultVariables;
	if (variables === undefined || variables.bot === name) return;

	variables.bot = name;
	// A tick later, or a component re-subscribing in the same commit as the answer never hears it.
	queueMicrotask(() => i18next.emit(BOT_NAMED));
}

/** Sets `lang`, which i18next does not, so a screen reader reads each language in its own voice. */
function markDocumentLanguage(language: string): void {
	document.documentElement.lang = language;
}

i18next.on("languageChanged", markDocumentLanguage);
if (typeof document !== "undefined") markDocumentLanguage(i18next.resolvedLanguage ?? "en");

export { i18next };
