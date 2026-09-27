import "i18next";
import type en from "@/i18n/locales/en.json";

/** Types the translation keys, so a misspelt key is a compile error. */
declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: { translation: typeof en };
	}
}
