import { TEMP_VOICE_LIMITS } from "@testify/shared";

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
