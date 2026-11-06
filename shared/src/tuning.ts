import { z } from "zod";

/** Percentages a server may set its pay or XP to; 100 is the bot's own rate. */
export const TUNING_RATES = [25, 50, 75, 100, 125, 150, 200, 300] as const;

/** Seconds between two messages that each earn XP. */
export const XP_COOLDOWN_SECONDS = [15, 30, 60, 120, 300] as const;

export const TUNING_LIMITS = { maxStartingWallet: 100_000 } as const;

export type TuningRate = (typeof TUNING_RATES)[number];

export type XpCooldown = (typeof XP_COOLDOWN_SECONDS)[number];

/** How a server's economy and levelling differ from the bot's own numbers. */
export interface ServerTuning {
	payRate: TuningRate;
	startingWallet: number;
	robbing: boolean;
	xpRate: TuningRate;
	xpCooldownSeconds: XpCooldown;
}

/** The bot's own numbers, which a server with no record plays by. */
export const DEFAULT_TUNING: ServerTuning = {
	payRate: 100,
	startingWallet: 500,
	robbing: true,
	xpRate: 100,
	xpCooldownSeconds: 60,
};

const rate = z.union(TUNING_RATES.map((value) => z.literal(value)));
const cooldown = z.union(XP_COOLDOWN_SECONDS.map((value) => z.literal(value)));

export const tuningPatch = z
	.object({
		payRate: rate.optional(),
		startingWallet: z.number().int().min(0).max(TUNING_LIMITS.maxStartingWallet).optional(),
		robbing: z.boolean().optional(),
		xpRate: rate.optional(),
		xpCooldownSeconds: cooldown.optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type TuningPatch = z.infer<typeof tuningPatch>;

/** Reads a stored record back, so a value no list offers, or one from a hand-edited record, becomes the default. */
export function tuningOf(stored: Partial<Record<keyof ServerTuning, unknown>> | null): ServerTuning {
	const pick = <T extends number>(list: readonly T[], value: unknown, fallback: T): T =>
		list.find((choice) => choice === value) ?? fallback;
	const wallet = stored?.startingWallet;

	return {
		payRate: pick(TUNING_RATES, stored?.payRate, DEFAULT_TUNING.payRate),
		startingWallet:
			typeof wallet === "number" && Number.isInteger(wallet) && wallet >= 0 && wallet <= TUNING_LIMITS.maxStartingWallet
				? wallet
				: DEFAULT_TUNING.startingWallet,
		robbing: typeof stored?.robbing === "boolean" ? stored.robbing : DEFAULT_TUNING.robbing,
		xpRate: pick(TUNING_RATES, stored?.xpRate, DEFAULT_TUNING.xpRate),
		xpCooldownSeconds: pick(XP_COOLDOWN_SECONDS, stored?.xpCooldownSeconds, DEFAULT_TUNING.xpCooldownSeconds),
	};
}

/** An amount at a server's rate, never less than one when there was anything to scale. */
export function atRate(amount: number, rate: number): number {
	if (amount <= 0) return amount;
	return Math.max(1, Math.round((amount * rate) / 100));
}
