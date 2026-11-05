import { type AutomodPreset } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

export const PRESET_LABELS: Record<AutomodPreset, { label: TranslationKey; describes: TranslationKey }> = {
	"flagged-words": { label: "automod.flaggedWords", describes: "automod.flaggedWordsAbout" },
	spam: { label: "automod.spam", describes: "automod.spamAbout" },
	"mention-spam": { label: "automod.mentionSpam", describes: "automod.mentionSpamAbout" },
	keyword: { label: "automod.keyword", describes: "automod.keywordAbout" },
};
