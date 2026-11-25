import { IDEA_STATUSES, type IdeaFilter, type IdeaSettings } from "@testify/shared";
import { type TFunction } from "i18next";

export const IDEA_FILTERS: readonly IdeaFilter[] = ["all", ...IDEA_STATUSES];

export function ideaFilterFrom(value: string | null): IdeaFilter {
	return IDEA_FILTERS.find((filter) => filter === value) ?? "all";
}

export function ideaSummary(
	settings: Pick<IdeaSettings, "enabled" | "channelId">,
	channel: string,
	t: TFunction,
): string {
	if (settings.channelId === null) return t("ideas.summaryNoChannel");
	return t(settings.enabled ? "ideas.summaryOn" : "ideas.summaryOff", { channel });
}
