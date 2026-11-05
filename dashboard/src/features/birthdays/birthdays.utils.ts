import { type BirthdaySettings } from "@testify/shared";
import { type TFunction } from "i18next";

export function birthdaySummary(
	settings: Pick<BirthdaySettings, "enabled" | "channelId">,
	channel: string,
	t: TFunction,
): string {
	if (settings.channelId === null) return t("birthdays.summaryNoChannel");
	return t(settings.enabled ? "birthdays.summaryOn" : "birthdays.summaryOff", { channel });
}
