import {
	getCasinoSettings,
	saveCasinoSettings,
	type StoredCasinoSettings,
} from "@database/repositories/casinoRepository";
import { formatNumber } from "@lib/format/format.util";
import { problemText } from "@lib/format/problemText.util";
import {
	CASINO_GAMES,
	CASINO_LIMITS,
	type CasinoGame,
	type CasinoPatch,
	type CasinoSettings,
	casinoProblem,
} from "@testify/shared";

export { CASINO_GAMES, CASINO_LIMITS };

export const CASINO_GAME_LABELS: Record<CasinoGame, string> = {
	roulette: "Roulette",
	blackjack: "Blackjack",
	slots: "Slots",
	hilo: "Hi-Lo",
	coinflip: "Coinflip",
	dice: "Dice",
};

export const CASINO_GAME_EMOJI: Record<CasinoGame, string> = {
	roulette: "🎡",
	blackjack: "🃏",
	slots: "🎰",
	hilo: "🔼",
	coinflip: "🪙",
	dice: "🎲",
};

/** A server with no record gets every game open and no ceiling, which is what a fresh install expects. */
export function normaliseCasinoSettings(stored: StoredCasinoSettings): CasinoSettings {
	const disabled = new Set(stored?.disabledGames ?? []);

	return {
		enabled: stored?.enabled ?? true,
		games: Object.fromEntries(CASINO_GAMES.map((game) => [game, !disabled.has(game)])) as Record<CasinoGame, boolean>,
		minBet: stored?.minBet ?? CASINO_LIMITS.minBet,
		maxBet: stored?.maxBet ?? null,
		configured: stored !== null,
	};
}

/** Why a new game is refused, or null; a hand already on the table is always allowed to finish. */
export function casinoRefusal(settings: CasinoSettings, game: CasinoGame | null): string | null {
	if (!settings.enabled) {
		return "The casino is closed in this server. Anybody with Manage Server can open it again with `/casino settings`.";
	}

	if (game !== null && !settings.games[game]) {
		return `${CASINO_GAME_LABELS[game]} is switched off in this server. Try another game at the casino.`;
	}

	return null;
}

/** Why a bet is outside the table's limits, or null. */
export function betLimitRefusal(settings: Pick<CasinoSettings, "minBet" | "maxBet">, bet: number): string | null {
	if (bet < settings.minBet) return `The smallest bet at this casino is **${formatNumber(settings.minBet)}**.`;
	if (settings.maxBet !== null && bet > settings.maxBet) {
		return `The largest bet at this casino is **${formatNumber(settings.maxBet)}**.`;
	}

	return null;
}

export function limitsLine(settings: Pick<CasinoSettings, "minBet" | "maxBet">): string {
	return settings.maxBet === null
		? `Bets from **${formatNumber(settings.minBet)}**, with no upper limit.`
		: `Bets from **${formatNumber(settings.minBet)}** to **${formatNumber(settings.maxBet)}**.`;
}

export async function readCasinoSettings(guildId: string): Promise<CasinoSettings> {
	return normaliseCasinoSettings(await getCasinoSettings(guildId));
}

/** Writes only what the patch carries, checked against the merged record because a patch can hold half a pair. */
export async function applyCasinoSettings(
	guildId: string,
	patch: CasinoPatch,
	actorId: string | null,
): Promise<{ settings: CasinoSettings } | { problem: string }> {
	const current = await readCasinoSettings(guildId);
	const next: CasinoSettings = {
		enabled: patch.enabled ?? current.enabled,
		games: { ...current.games, ...patch.games },
		minBet: patch.minBet ?? current.minBet,
		maxBet: patch.maxBet === undefined ? current.maxBet : patch.maxBet,
		configured: true,
	};

	const problem = casinoProblem(next);
	if (problem !== null) return { problem: problemText(problem) };

	await saveCasinoSettings(
		guildId,
		{
			enabled: next.enabled,
			disabledGames: CASINO_GAMES.filter((game) => !next.games[game]),
			minBet: next.minBet,
			maxBet: next.maxBet,
		},
		actorId,
	);

	return { settings: next };
}
