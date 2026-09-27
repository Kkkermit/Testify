import { z } from "zod";
import { type Problem, problem } from "./problems";

/** The casino's per-server settings: whether it runs, which games are open, and how much a single bet may be. */

export const CASINO_GAMES = ["roulette", "blackjack", "slots", "hilo", "coinflip", "dice"] as const;

export type CasinoGame = (typeof CASINO_GAMES)[number];

export const CASINO_LIMITS = {
	minBet: 1,
	maxBet: 1_000_000_000,
} as const;

export interface CasinoSettings {
	enabled: boolean;
	games: Record<CasinoGame, boolean>;
	minBet: number;
	/** Null means no ceiling beyond what the player holds. */
	maxBet: number | null;
	/** False while the guild has no record, so a page can say the settings shown are only defaults. */
	configured: boolean;
}

export function isCasinoGame(value: string): value is CasinoGame {
	return (CASINO_GAMES as readonly string[]).includes(value);
}

const bet = z.coerce.number().int().min(CASINO_LIMITS.minBet).max(CASINO_LIMITS.maxBet);

export const casinoPatch = z
	.object({
		enabled: z.boolean(),
		games: z.object(Object.fromEntries(CASINO_GAMES.map((game) => [game, z.boolean()]))).partial(),
		minBet: bet,
		maxBet: bet.nullable(),
	})
	.partial();

export type CasinoPatch = Omit<z.infer<typeof casinoPatch>, "games"> & {
	games?: Partial<Record<CasinoGame, boolean>>;
};

/** Checked against the merged record, because a patch can carry one half of the pair. */
export function casinoProblem(settings: Pick<CasinoSettings, "minBet" | "maxBet">): Problem | null {
	if (settings.maxBet !== null && settings.maxBet < settings.minBet) return problem("casino.betRange");

	return null;
}
