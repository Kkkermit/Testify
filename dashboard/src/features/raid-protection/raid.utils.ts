import { RAID_LIMITS, type RaidSettings } from "@testify/shared";
import { type TFunction } from "i18next";
import { formatUnit } from "@/lib/intl";

export function numberIn(raw: string, min: number, max: number): number | null {
	const value = Number(raw.trim());
	if (raw.trim() === "" || !Number.isInteger(value)) return null;
	return value >= min && value <= max ? value : null;
}

/** Minutes in each unit the age is picked in, largest last. */
export const AGE_UNITS = { minutes: 1, hours: 60, days: 1_440 } as const;

export type AgeUnit = keyof typeof AGE_UNITS;

const INTL_UNIT = { minutes: "minute", hours: "hour", days: "day" } as const;

/** The largest unit the minutes divide into whole, so a stored 1,440 reads as 1 day and 90 as 90 minutes. */
export function ageParts(minutes: number): { value: number; unit: AgeUnit } {
	if (minutes > 0 && minutes % AGE_UNITS.days === 0) return { value: minutes / AGE_UNITS.days, unit: "days" };
	if (minutes > 0 && minutes % AGE_UNITS.hours === 0) return { value: minutes / AGE_UNITS.hours, unit: "hours" };
	return { value: minutes, unit: "minutes" };
}

/** What was typed, in minutes, or null for anything but a whole number within Discord's longest timeout. */
export function ageMinutes(raw: string, unit: AgeUnit): number | null {
	const value = numberIn(raw, 0, Number.MAX_SAFE_INTEGER);
	if (value === null) return null;
	const minutes = value * AGE_UNITS[unit];
	return minutes <= RAID_LIMITS.maxAccountAgeMinutes ? minutes : null;
}

/** A length of whole minutes in the reader's language: "90 minutes", "12 hours", "7 days". */
export function ageText(minutes: number): string {
	const { value, unit } = ageParts(minutes);
	return formatUnit(value, INTL_UNIT[unit], { display: "long" });
}

export function hasWork(settings: Pick<RaidSettings, "minAccountAgeMinutes" | "alertChannelId">): boolean {
	return settings.minAccountAgeMinutes > 0 || settings.alertChannelId !== null;
}

export function raidSummary(
	settings: Pick<RaidSettings, "enabled" | "minAccountAgeMinutes" | "alertChannelId">,
	channel: string,
	t: TFunction,
): string {
	if (!settings.enabled || !hasWork(settings)) return t("raid.summaryOff");

	const minutes = settings.minAccountAgeMinutes;
	if (settings.alertChannelId === null) return t("raid.summaryHold", { age: ageText(minutes) });
	return minutes === 0
		? t("raid.summaryAlert", { channel })
		: t("raid.summaryHoldAlert", { age: ageText(minutes), channel });
}
