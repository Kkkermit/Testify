import { type RaidSettings } from "@testify/shared";

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
