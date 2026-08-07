import { z } from "zod";

export const TREASURE_LIMITS = {
	minMessages: 5,
	maxMessages: 1_000,
	minAmount: 1,
	maxAmount: 100_000,
	minCooldownMinutes: 1,
	maxCooldownMinutes: 1_440,
} as const;

export const TREASURE_DEFAULTS = {
	minMessages: 15,
	maxMessages: 50,
	minAmount: 10,
	maxAmount: 500,
	cooldownMs: 300_000,
} as const;

export interface TreasureSettings {
	enabled: boolean;
	minMessages: number;
	maxMessages: number;
	minAmount: number;
	maxAmount: number;
	cooldownMs: number;
	/** False while the guild has no record, so the page can say the numbers shown are only defaults. */
	configured: boolean;
}

const messages = z.coerce.number().int().min(TREASURE_LIMITS.minMessages).max(TREASURE_LIMITS.maxMessages);
const amount = z.coerce.number().int().min(TREASURE_LIMITS.minAmount).max(TREASURE_LIMITS.maxAmount);

export const treasurePatch = z
	.object({
		enabled: z.boolean(),
		minMessages: messages,
		maxMessages: messages,
		minAmount: amount,
		maxAmount: amount,
		cooldownMs: z.coerce
			.number()
			.int()
			.min(TREASURE_LIMITS.minCooldownMinutes * 60_000)
			.max(TREASURE_LIMITS.maxCooldownMinutes * 60_000),
	})
	.partial();

export type TreasurePatch = z.infer<typeof treasurePatch>;

/** The pair rules, checked against the merged record because a patch can carry one half of a pair. */
export function treasureProblem(
	settings: Pick<TreasureSettings, "minMessages" | "maxMessages" | "minAmount" | "maxAmount">,
): string | null {
	if (settings.minMessages > settings.maxMessages) return "The fewest messages cannot be more than the most.";
	if (settings.minAmount > settings.maxAmount) return "The smallest drop cannot be more than the largest.";

	return null;
}
