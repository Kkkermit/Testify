import { AUTO_RESPONDER_MATCHES, type AutoResponderMatch } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

export const MATCH_LABELS: Record<AutoResponderMatch, TranslationKey> = {
	word: "autoResponders.matchWord",
	exact: "autoResponders.matchExact",
	starts: "autoResponders.matchStarts",
};

export const MATCH_ORDER = AUTO_RESPONDER_MATCHES;
