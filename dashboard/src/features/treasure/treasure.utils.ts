import { TREASURE_LIMITS, type TreasureSettings, treasureProblem } from "@testify/shared";
import { type TFunction } from "i18next";
import { formatNumber } from "@/lib/intl";
import { problemText } from "@/lib/problemText";

const MINUTE = 60_000;

export function toMinutes(ms: number): number {
	return Math.round(ms / MINUTE);
}

export function toMilliseconds(minutes: number): number {
	return minutes * MINUTE;
}

export interface Draft {
	minMessages: number;
	maxMessages: number;
	minAmount: number;
	maxAmount: number;
	cooldownMinutes: number;
}

export function draftOf(settings: TreasureSettings): Draft {
	return {
		minMessages: settings.minMessages,
		maxMessages: settings.maxMessages,
		minAmount: settings.minAmount,
		maxAmount: settings.maxAmount,
		cooldownMinutes: toMinutes(settings.cooldownMs),
	};
}

function outOfRange(value: number, min: number, max: number): boolean {
	return !Number.isInteger(value) || value < min || value > max;
}

/** Why a draft would be refused, in the words the form shows, so nobody saves and gets a 400 back. */
export function draftProblem(draft: Draft, t: TFunction): string | null {
	const { minMessages, maxMessages, minAmount, maxAmount, cooldownMinutes } = draft;

	if (outOfRange(minMessages, TREASURE_LIMITS.minMessages, TREASURE_LIMITS.maxMessages)) {
		return t("treasure.messagesBetween", { min: TREASURE_LIMITS.minMessages, max: TREASURE_LIMITS.maxMessages });
	}
	if (outOfRange(maxMessages, TREASURE_LIMITS.minMessages, TREASURE_LIMITS.maxMessages)) {
		return t("treasure.messagesBetween", { min: TREASURE_LIMITS.minMessages, max: TREASURE_LIMITS.maxMessages });
	}
	if (outOfRange(minAmount, TREASURE_LIMITS.minAmount, TREASURE_LIMITS.maxAmount)) {
		return t("treasure.dropBetween", { min: TREASURE_LIMITS.minAmount, max: TREASURE_LIMITS.maxAmount });
	}
	if (outOfRange(maxAmount, TREASURE_LIMITS.minAmount, TREASURE_LIMITS.maxAmount)) {
		return t("treasure.dropBetween", { min: TREASURE_LIMITS.minAmount, max: TREASURE_LIMITS.maxAmount });
	}
	if (outOfRange(cooldownMinutes, TREASURE_LIMITS.minCooldownMinutes, TREASURE_LIMITS.maxCooldownMinutes)) {
		return t("treasure.cooldownBetween", {
			min: TREASURE_LIMITS.minCooldownMinutes,
			max: TREASURE_LIMITS.maxCooldownMinutes,
		});
	}

	return problemText(treasureProblem({ minMessages, maxMessages, minAmount, maxAmount }), t);
}

export function isDirty(draft: Draft, settings: TreasureSettings): boolean {
	const saved = draftOf(settings);

	return (Object.keys(saved) as (keyof Draft)[]).some((field) => draft[field] !== saved[field]);
}

/** How often a drop can actually appear, which is the pair of numbers read together rather than separately. */
export function describeRate(draft: Draft, t: TFunction): string {
	const range = (low: number, high: number): string =>
		low === high ? formatNumber(low) : `${formatNumber(low)}–${formatNumber(high)}`;

	return t("treasure.rate", {
		amount: range(draft.minAmount, draft.maxAmount),
		messages: range(draft.minMessages, draft.maxMessages),
		count: draft.cooldownMinutes,
	});
}
