import { SETTINGS_LIMITS } from "@testify/shared";

/**
 * Why a prefix cannot be saved, in the words shown under the field — the same three rules the API enforces:
 * pure whitespace matches every message, a space inside can never be typed, and `/` collides with Discord's own.
 */
export function prefixProblem(value: string): string | null {
	const trimmed = value.trim();

	if (trimmed === "") return "The prefix cannot be empty.";
	if (/\s/.test(trimmed)) return "The prefix cannot contain a space.";
	if (trimmed.length > SETTINGS_LIMITS.maxPrefix) {
		return `The prefix cannot be longer than ${String(SETTINGS_LIMITS.maxPrefix)} characters.`;
	}
	if (trimmed.startsWith("/")) return "A prefix starting with / collides with Discord's own commands.";

	return null;
}

/** A typed number out of an input can be anything, including nothing. */
export function countCapProblem(value: string): string | null {
	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 1) return "The target has to be a whole number of at least 1.";
	if (parsed > SETTINGS_LIMITS.maxCount) {
		return `The target cannot be higher than ${SETTINGS_LIMITS.maxCount.toLocaleString()}.`;
	}

	return null;
}

/** How far through the count a server is, for the progress readout. */
export function countProgress(count: number, maxCount: number): number {
	if (maxCount <= 0) return 0;
	return Math.min(100, Math.round((count / maxCount) * 100));
}
