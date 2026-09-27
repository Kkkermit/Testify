import { type WelcomePlaceholder } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

/** What each greeting placeholder stands for; the tokens themselves are `@testify/shared`'s. */

export const PLACEHOLDER_LABELS: Record<WelcomePlaceholder, TranslationKey> = {
	"{user}": "welcome.tokenUser",
	"{username}": "welcome.tokenUsername",
	"{server}": "welcome.tokenServer",
	"{count}": "welcome.tokenCount",
};
