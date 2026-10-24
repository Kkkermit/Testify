import { STARBOARD_LIMITS } from "@testify/shared";

/** The threshold typed into the box, or null while it is not one the API would take. */
export function thresholdFrom(raw: string): number | null {
	const value = Number(raw.trim());
	if (raw.trim() === "" || !Number.isInteger(value)) return null;

	return value >= STARBOARD_LIMITS.minThreshold && value <= STARBOARD_LIMITS.maxThreshold ? value : null;
}
