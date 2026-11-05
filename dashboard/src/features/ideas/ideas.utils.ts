import { IDEA_STATUSES, type IdeaFilter, type IdeaSettings } from "@testify/shared";
import { type TFunction } from "i18next";

const FILTERS: readonly IdeaFilter[] = ["all", ...IDEA_STATUSES];

export function ideaFilterFrom(value: string | null): IdeaFilter {
	return FILTERS.find((filter) => filter === value) ?? "all";
}

export function pageFrom(value: string | null): number {
	const page = Number(value);
	return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function pageCount(total: number, perPage: number): number {
	return Math.max(1, Math.ceil(total / perPage));
}

export function ideaSummary(
	settings: Pick<IdeaSettings, "enabled" | "channelId">,
	channel: string,
	t: TFunction,
): string {
	if (settings.channelId === null) return t("ideas.summaryNoChannel");
	return t(settings.enabled ? "ideas.summaryOn" : "ideas.summaryOff", { channel });
}
