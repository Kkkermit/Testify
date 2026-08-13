import "i18next";
import type en from "@/i18n/locales/en.json";

/**
 * Declaration merging is how i18next types its own keys: `t("nav.serrvers")` becomes a compile error rather
 * than a string that renders its own key. English is the source, so every other locale is checked against it
 * by `locales.test.ts` instead.
 */
declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: { translation: typeof en };
	}
}
