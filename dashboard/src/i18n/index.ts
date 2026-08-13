import i18next, { type ParseKeys } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import de from "@/i18n/locales/de.json";
import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";
import fr from "@/i18n/locales/fr.json";

/** Every key English defines. A nav entry or a component naming one that is not there fails the build. */
export type TranslationKey = ParseKeys<"translation">;

export const LOCALES = ["en", "es", "de", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

/** Endonyms: somebody looking for their own language is looking for the word they call it by. */
export const LOCALE_NAMES: Record<Locale, string> = {
	en: "English",
	es: "Español",
	de: "Deutsch",
	fr: "Français",
};

export const LOCALE_STORAGE_KEY = "testify:locale";

export function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && LOCALES.includes(value as Locale);
}

export const resources = {
	en: { translation: en },
	es: { translation: es },
	de: { translation: de },
	fr: { translation: fr },
} as const;

void i18next
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
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
		},
	});

/**
 * i18next does not touch the document, and nothing else can be trusted to: a screen reader picks its voice from
 * `lang`, so French copy left marked `en` is read aloud in an English accent. Wired to the instance rather than
 * to a component, because it has to hold whatever renders.
 */
function markDocumentLanguage(language: string): void {
	document.documentElement.lang = language;
}

i18next.on("languageChanged", markDocumentLanguage);
if (typeof document !== "undefined") markDocumentLanguage(i18next.resolvedLanguage ?? "en");

export { i18next };
