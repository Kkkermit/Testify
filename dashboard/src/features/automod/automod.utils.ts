import { type AutomodRuleSummary } from "@testify/shared";
import { type TFunction } from "i18next";

export function automodSummary(rules: readonly Pick<AutomodRuleSummary, "enabled">[], t: TFunction): string {
	if (rules.length === 0) return t("automod.summaryNone");
	const on = rules.filter((rule) => rule.enabled).length;
	return on === 0 ? t("automod.summaryAllOff") : t("automod.summary", { count: on });
}
