import { type HeistState } from "@lib/economy/economy.types";
const games = new Map<string, HeistState>();

/** Keyed by guild, so two servers can run a heist at the same time. */
export function activeHeists(): Map<string, HeistState> {
	return games;
}
