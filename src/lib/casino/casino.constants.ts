import { DAY_MS, MINUTE_MS, SECOND_MS } from "@config/constants";

/** The custom-ID prefixes the casino's panels and their button handlers share. */
export const CASINO_ID = "casino";
export const CASINO_SETTINGS_ID = "casinoset";

/** The subcommand that stays reachable while the casino is switched off, so a server can turn it back on. */
export const CASINO_SETTINGS_SUBCOMMAND = "settings";

export const CASINO_TIMING = {
	/** A card hand nobody touches for this long is played out for them and paid. */
	handIdleMs: 10 * MINUTE_MS,
	sweepEveryMs: MINUTE_MS,
	/** How long after an animation starts the message swaps it for the settled picture. */
	revealMarginMs: 1_500,
} as const;

export const CASINO_COMMAND = "casino";

/** A shared roulette round: how long it takes bets once the first lands, and how many one player may place. */
export const ROULETTE_ROUND = {
	bettingMs: 30 * SECOND_MS,
	maxBets: 10,
	/** What a chip is worth when a table opens, kept within the server's own bet limits. */
	defaultChip: 100,
	/** A round still open this long past its close lost its timer to a restart, and the sweep spins it. */
	overdueMs: 30 * SECOND_MS,
	/** A round is removed this long after it was opened or last due, whichever is later. */
	keepMs: DAY_MS,
} as const;

export const ROULETTE_ID = "roulette";

/** Each player's chips in the order they sat down, with the emoji the message names them by. */
export const SEAT_COLOURS = [
	{ fill: "#2f6fdc", emoji: "🔵" },
	{ fill: "#1f9d55", emoji: "🟢" },
	{ fill: "#8e44ad", emoji: "🟣" },
	{ fill: "#e67e22", emoji: "🟠" },
	{ fill: "#f1c40f", emoji: "🟡" },
	{ fill: "#8d5a3b", emoji: "🟤" },
	{ fill: "#ecf0f1", emoji: "⚪" },
] as const;
