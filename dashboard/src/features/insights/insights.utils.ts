import { type InsightWindow, type VerificationLevel } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

export const VERIFICATION_LABELS: Record<VerificationLevel, TranslationKey> = {
	none: "insights.verificationNone",
	low: "insights.verificationLow",
	medium: "insights.verificationMedium",
	high: "insights.verificationHigh",
	highest: "insights.verificationHighest",
};

export const INSIGHT_WINDOW_LABELS: Record<InsightWindow, TranslationKey> = {
	7: "insights.window7",
	30: "insights.window30",
};

/** A 24-hour clock with no locale in it, because the hours are UTC and say so beside them. */
export function hourLabel(hour: number): string {
	return `${String(hour).padStart(2, "0")}:00`;
}

/** Percent of the tallest bar, with a sliver for any non-zero count so a quiet hour is still visibly not silent. */
export function barHeight(count: number, max: number): number {
	if (count <= 0 || max <= 0) return 0;
	return Math.max(4, Math.round((count / max) * 100));
}
