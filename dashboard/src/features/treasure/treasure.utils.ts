import { TREASURE_LIMITS, type TreasureSettings, treasureProblem } from "@testify/shared";

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
export function draftProblem(draft: Draft): string | null {
	const { minMessages, maxMessages, minAmount, maxAmount, cooldownMinutes } = draft;

	if (outOfRange(minMessages, TREASURE_LIMITS.minMessages, TREASURE_LIMITS.maxMessages)) {
		return `Messages must be between ${String(TREASURE_LIMITS.minMessages)} and ${String(TREASURE_LIMITS.maxMessages)}.`;
	}
	if (outOfRange(maxMessages, TREASURE_LIMITS.minMessages, TREASURE_LIMITS.maxMessages)) {
		return `Messages must be between ${String(TREASURE_LIMITS.minMessages)} and ${String(TREASURE_LIMITS.maxMessages)}.`;
	}
	if (outOfRange(minAmount, TREASURE_LIMITS.minAmount, TREASURE_LIMITS.maxAmount)) {
		return `A drop must be between ${String(TREASURE_LIMITS.minAmount)} and ${String(TREASURE_LIMITS.maxAmount)}.`;
	}
	if (outOfRange(maxAmount, TREASURE_LIMITS.minAmount, TREASURE_LIMITS.maxAmount)) {
		return `A drop must be between ${String(TREASURE_LIMITS.minAmount)} and ${String(TREASURE_LIMITS.maxAmount)}.`;
	}
	if (outOfRange(cooldownMinutes, TREASURE_LIMITS.minCooldownMinutes, TREASURE_LIMITS.maxCooldownMinutes)) {
		return `The cooldown must be between ${String(TREASURE_LIMITS.minCooldownMinutes)} and ${String(TREASURE_LIMITS.maxCooldownMinutes)} minutes.`;
	}

	return treasureProblem({ minMessages, maxMessages, minAmount, maxAmount });
}

export function isDirty(draft: Draft, settings: TreasureSettings): boolean {
	const saved = draftOf(settings);

	return (Object.keys(saved) as (keyof Draft)[]).some((field) => draft[field] !== saved[field]);
}

/** How often a drop can actually appear, which is the pair of numbers read together rather than separately. */
export function describeRate(draft: Draft): string {
	const messages =
		draft.minMessages === draft.maxMessages
			? `every ${String(draft.minMessages)} messages`
			: `every ${String(draft.minMessages)}–${String(draft.maxMessages)} messages`;
	const amount =
		draft.minAmount === draft.maxAmount
			? String(draft.minAmount)
			: `${String(draft.minAmount)}–${String(draft.maxAmount)}`;

	return `A drop of ${amount} ${messages}, at most once every ${String(draft.cooldownMinutes)} minutes.`;
}
