import { MINUTE_MS } from "@config/constants";

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
