import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";

const CATEGORY_LABELS: Record<string, TranslationKey> = {
	community: "commands.categoryCommunity",
	economy: "commands.categoryEconomy",
	casino: "commands.categoryCasino",
	fun: "commands.categoryFun",
	games: "commands.categoryGames",
	info: "commands.categoryInfo",
	levelling: "commands.categoryLevelling",
	moderation: "commands.categoryModeration",
	music: "commands.categoryMusic",
	settings: "commands.categorySettings",
	tickets: "commands.categoryTickets",
	giveaway: "commands.categoryGiveaway",
	developer: "commands.categoryDeveloper",
	owner: "commands.categoryOwner",
};

/** A category the dashboard has not been told about yet is shown by its own name rather than as a key. */
export function categoryLabel(name: string, t: TFunction): string {
	const key = CATEGORY_LABELS[name];
	return key === undefined ? name : t(key);
}
