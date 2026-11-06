import { type ModmailSettings } from "@testify/shared";
import { type TFunction } from "i18next";

export function modmailSummary(
	settings: Pick<ModmailSettings, "enabled" | "channelId">,
	channel: string,
	t: TFunction,
): string {
	if (settings.channelId === null) return t("modmail.summaryNoChannel");
	return t(settings.enabled ? "modmail.summaryOn" : "modmail.summaryOff", { channel });
}
