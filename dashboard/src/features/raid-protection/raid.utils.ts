import { type RaidSettings } from "@testify/shared";
import { type TFunction } from "i18next";

export function numberIn(raw: string, min: number, max: number): number | null {
	const value = Number(raw.trim());
	if (raw.trim() === "" || !Number.isInteger(value)) return null;
	return value >= min && value <= max ? value : null;
}

export function hasWork(settings: Pick<RaidSettings, "minAccountAgeDays" | "alertChannelId">): boolean {
	return settings.minAccountAgeDays > 0 || settings.alertChannelId !== null;
}

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
