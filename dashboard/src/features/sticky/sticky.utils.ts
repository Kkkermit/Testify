import { type TFunction } from "i18next";

export function stickySummary(count: number, t: TFunction): string {
	return count === 0 ? t("sticky.summaryNone") : t("sticky.summary", { count });
}
