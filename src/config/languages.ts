/** The languages the bot speaks besides English, and the Discord locales each one answers. */

export const BOT_LANGUAGES = ["en", "de", "es", "fr", "it", "ru", "nl", "ja"] as const;

export type BotLanguage = (typeof BOT_LANGUAGES)[number];

export type TranslatedLanguage = Exclude<BotLanguage, "en">;

/** Spanish is offered to Spain and to Latin America alike, since Discord keeps the two apart. */
export const DISCORD_LOCALES = {
	de: ["de"],
	es: ["es-ES", "es-419"],
	fr: ["fr"],
	it: ["it"],
	ru: ["ru"],
	nl: ["nl"],
	ja: ["ja"],
} as const satisfies Record<TranslatedLanguage, readonly string[]>;
