import { TEMP_VOICE_LIMITS, type TempVoiceSettings } from "@testify/shared";
import { type TFunction } from "i18next";

export function userLimitFrom(raw: string): number | null {
	const value = Number(raw.trim());
	if (raw.trim() === "" || !Number.isInteger(value)) return null;

	return value >= 0 && value <= TEMP_VOICE_LIMITS.maxUserLimit ? value : null;
}

export function nameTemplateFrom(raw: string): string | null {
	const name = raw.trim();
	return name === "" || name.length > TEMP_VOICE_LIMITS.maxTemplate ? null : name;
}

export function tempVoiceSummary(
	settings: Pick<TempVoiceSettings, "enabled" | "lobbyChannelId">,
	lobby: string,
	t: TFunction,
): string {
	if (settings.lobbyChannelId === null) return t("tempVoice.summaryNoLobby");
	return t(settings.enabled ? "tempVoice.summaryOn" : "tempVoice.summaryOff", { lobby });
}
