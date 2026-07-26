import { type TestifyClient } from "../../../core/client";

export interface HeistState {
	guildId: string;
	leaderId: string;
	stake: number;
	participants: Set<string>;
	startedAt: number;
	messageId: string | null;
}

const STATE_KEY = "economy:heists";

/**
 * Keyed by guild, owned by this module, and created exactly once. The previous
 * version created `client.activeHeists` lazily in two different places.
 */
export function activeHeists(client: TestifyClient): Map<string, HeistState> {
	return client.featureState(STATE_KEY, () => new Map<string, HeistState>());
}
