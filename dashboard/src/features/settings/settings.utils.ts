import { SETTINGS_LIMITS } from "@testify/shared";
import { type TFunction } from "i18next";

/** The three rules the API enforces: whitespace matches every message, a space inside can never be typed, and `/` collides with Discord's own. */
export function prefixProblem(value: string, t: TFunction): string | null {
	const trimmed = value.trim();

	if (trimmed === "") return t("settings.prefixEmpty");
	if (/\s/.test(trimmed)) return t("settings.prefixSpace");
	if (trimmed.length > SETTINGS_LIMITS.maxPrefix) {
		return t("settings.prefixLong", { max: SETTINGS_LIMITS.maxPrefix });
	}
	if (trimmed.startsWith("/")) return t("settings.prefixSlash");

	return null;
}

/** A typed number out of an input can be anything, including nothing. */
export function countCapProblem(value: string, t: TFunction): string | null {
	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 1) return t("settings.countWhole");
	if (parsed > SETTINGS_LIMITS.maxCount) {
		return t("settings.countHigh", { max: SETTINGS_LIMITS.maxCount.toLocaleString() });
	}

	return null;
}

/** How far through the count a server is, for the progress readout. */
export function countProgress(count: number, maxCount: number): number {
	if (maxCount <= 0) return 0;
	return Math.min(100, Math.round((count / maxCount) * 100));
}
