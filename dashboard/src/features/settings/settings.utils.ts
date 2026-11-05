import { SETTINGS_LIMITS } from "@testify/shared";
import { type TFunction } from "i18next";
import { formatNumber } from "@/lib/intl";

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

export function countCapProblem(value: string, t: TFunction): string | null {
	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 1) return t("settings.countWhole");
	if (parsed > SETTINGS_LIMITS.maxCount) {
		return t("settings.countHigh", { max: formatNumber(SETTINGS_LIMITS.maxCount) });
	}

	return null;
}

export function countProgress(count: number, maxCount: number): number {
	if (maxCount <= 0) return 0;
	return Math.min(100, Math.round((count / maxCount) * 100));
}
