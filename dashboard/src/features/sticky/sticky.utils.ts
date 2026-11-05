import { type TFunction } from "i18next";

/** How many channels keep a message at their foot, as the sentence the page opens with. */
export function stickySummary(count: number, t: TFunction): string {
	return count === 0 ? t("sticky.summaryNone") : t("sticky.summary", { count });
}
