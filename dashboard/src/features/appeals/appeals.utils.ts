import { APPEAL_STATUSES, type AppealFilter, type AppealSettings } from "@testify/shared";
import { type TFunction } from "i18next";

const FILTERS: readonly AppealFilter[] = [...APPEAL_STATUSES, "all"];

/** The page opens on what is waiting, since that is the only part anybody has to act on. */
export function appealFilterFrom(value: string | null): AppealFilter {
	return FILTERS.find((filter) => filter === value) ?? "open";
}

export function appealSummary(
	settings: Pick<AppealSettings, "enabled" | "channelId">,
	channel: string,
	t: TFunction,
): string {
	if (settings.channelId === null) return t("appeals.summaryNoChannel");
	return t(settings.enabled ? "appeals.summaryOn" : "appeals.summaryOff", { channel });
}
