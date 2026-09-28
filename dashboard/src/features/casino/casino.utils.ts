import { CASINO_GAMES, CASINO_LIMITS, type CasinoGame, type CasinoSettings, casinoProblem } from "@testify/shared";
import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";
import { problemText } from "@/lib/problemText";

export const GAME_LABELS: Record<CasinoGame, TranslationKey> = {
	roulette: "casino.roulette",
	blackjack: "casino.blackjack",
	slots: "casino.slots",
	hilo: "casino.hilo",
	coinflip: "casino.coinflip",
	dice: "casino.dice",
};

export const GAME_HINTS: Record<CasinoGame, TranslationKey> = {
	roulette: "casino.rouletteHint",
	blackjack: "casino.blackjackHint",
	slots: "casino.slotsHint",
	hilo: "casino.hiloHint",
	coinflip: "casino.coinflipHint",
	dice: "casino.diceHint",
};

export function openGames(settings: Pick<CasinoSettings, "games">): number {
	return CASINO_GAMES.filter((game) => settings.games[game]).length;
}

/** Kept as typed, so an empty largest bet can mean "no limit" rather than zero. */
export interface LimitsDraft {
	min: string;
	max: string;
}

export function draftOf(settings: Pick<CasinoSettings, "minBet" | "maxBet">): LimitsDraft {
	return { min: String(settings.minBet), max: settings.maxBet === null ? "" : String(settings.maxBet) };
}

function wholeBet(raw: string): number | null {
	const value = Number(raw.trim());
	if (raw.trim() === "" || !Number.isInteger(value)) return null;

	return value >= CASINO_LIMITS.minBet && value <= CASINO_LIMITS.maxBet ? value : null;
}

/** The limits a draft would save, or null while it cannot be saved. */
export function limitsOf(draft: LimitsDraft): { minBet: number; maxBet: number | null } | null {
	const minBet = wholeBet(draft.min);
	const maxBet = draft.max.trim() === "" ? null : wholeBet(draft.max);
	if (minBet === null || (draft.max.trim() !== "" && maxBet === null)) return null;

	return { minBet, maxBet };
}

/** Why a draft would be refused, in the words the form shows, so nobody saves and gets a 400 back. */
export function limitsProblem(draft: LimitsDraft, t: TFunction): string | null {
	const range = { min: CASINO_LIMITS.minBet, max: CASINO_LIMITS.maxBet };

	if (wholeBet(draft.min) === null) return t("casino.minBetRange", range);
	if (draft.max.trim() !== "" && wholeBet(draft.max) === null) return t("casino.maxBetRange", range);

	const limits = limitsOf(draft);

	return limits === null ? null : problemText(casinoProblem(limits), t);
}

export function isDirty(draft: LimitsDraft, settings: Pick<CasinoSettings, "minBet" | "maxBet">): boolean {
	const saved = draftOf(settings);

	return draft.min.trim() !== saved.min || draft.max.trim() !== saved.max;
}
