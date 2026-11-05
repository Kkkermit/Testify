import { TEMP_VOICE_LIMITS, type TempVoiceSettings } from "@testify/shared";
import { type TFunction } from "i18next";

/** The limit typed into the box, or null while it is not one Discord would take. */
export function userLimitFrom(raw: string): number | null {
	const value = Number(raw.trim());
	if (raw.trim() === "" || !Number.isInteger(value)) return null;

	return value >= 0 && value <= TEMP_VOICE_LIMITS.maxUserLimit ? value : null;
}

/** The name pattern typed into the box, or null while it is empty or too long to save. */
export function nameTemplateFrom(raw: string): string | null {
	const name = raw.trim();
	return name === "" || name.length > TEMP_VOICE_LIMITS.maxTemplate ? null : name;
}

/** What joining the lobby does, as the sentence the page opens with. */
export function tempVoiceSummary(
	settings: Pick<TempVoiceSettings, "enabled" | "lobbyChannelId">,
	lobby: string,
	t: TFunction,
): string {
	if (settings.lobbyChannelId === null) return t("tempVoice.summaryNoLobby");
	return t(settings.enabled ? "tempVoice.summaryOn" : "tempVoice.summaryOff", { lobby });
}
