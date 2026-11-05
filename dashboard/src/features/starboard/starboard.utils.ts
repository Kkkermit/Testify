import { STARBOARD_LIMITS, type StarboardSettings } from "@testify/shared";
import { type TFunction } from "i18next";

export function thresholdFrom(raw: string): number | null {
	const value = Number(raw.trim());
	if (raw.trim() === "" || !Number.isInteger(value)) return null;

	return value >= STARBOARD_LIMITS.minThreshold && value <= STARBOARD_LIMITS.maxThreshold ? value : null;
}

export function starboardSummary(
	settings: Pick<StarboardSettings, "enabled" | "channelId" | "threshold" | "selfStar">,
	channel: string,
	t: TFunction,
): string {
	if (settings.channelId === null) return t("starboard.summaryNoChannel");
	if (!settings.enabled) return t("starboard.summaryOff", { channel });

	return t(settings.selfStar ? "starboard.summaryOnSelf" : "starboard.summaryOn", { n: settings.threshold, channel });
}
