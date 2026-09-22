export interface HeistState {
	guildId: string;
	leaderId: string;
	stake: number;
	participants: Set<string>;
	startedAt: number;
	messageId: string | null;
}

const games = new Map<string, HeistState>();

/** Keyed by guild, so two servers can run a heist at the same time. */
export function activeHeists(): Map<string, HeistState> {
	return games;
}
