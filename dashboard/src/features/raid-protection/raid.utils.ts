import { type RaidSettings } from "@testify/shared";
import { type TFunction } from "i18next";

/** A whole number typed into a box, or null while it is not one the API would take. */
export function numberIn(raw: string, min: number, max: number): number | null {
	const value = Number(raw.trim());
	if (raw.trim() === "" || !Number.isInteger(value)) return null;
	return value >= min && value <= max ? value : null;
}

/** On with neither a minimum age nor an alert channel would protect nothing, so it cannot be switched on. */
export function hasWork(settings: Pick<RaidSettings, "minAccountAgeDays" | "alertChannelId">): boolean {
	return settings.minAccountAgeDays > 0 || settings.alertChannelId !== null;
}

/** Who is held back and where a spike is reported, as the sentence the page opens with. */
export function raidSummary(
	settings: Pick<RaidSettings, "enabled" | "minAccountAgeDays" | "alertChannelId">,
	channel: string,
	t: TFunction,
): string {
	if (!settings.enabled || !hasWork(settings)) return t("raid.summaryOff");

	const days = settings.minAccountAgeDays;
	if (settings.alertChannelId === null) return t("raid.summaryHold", { count: days });
	return days === 0 ? t("raid.summaryAlert", { channel }) : t("raid.summaryHoldAlert", { count: days, channel });
}
