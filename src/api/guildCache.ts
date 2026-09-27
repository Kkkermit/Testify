import { type OauthGuild } from "@api/discord";

/** Each signed-in person's last guild list from Discord, so a refresh does not cost a round trip every time. */

/** Reused outright inside this window; Discord limits `/users/@me/guilds` tightly. */
export const FRESH_MS = 30_000;
/** Served instead of an error while Discord is refusing, for up to this long after it was fetched. */
export const STALE_MS = 15 * 60_000;
const MAX_ENTRIES = 1_000;

interface Entry {
	guilds: OauthGuild[];
	at: number;
}

export class GuildListCache {
	readonly #entries = new Map<string, Entry>();

	fresh(userId: string, now = Date.now()): OauthGuild[] | null {
		const entry = this.#entries.get(userId);
		return entry !== undefined && now - entry.at < FRESH_MS ? entry.guilds : null;
	}

	stale(userId: string, now = Date.now()): OauthGuild[] | null {
		const entry = this.#entries.get(userId);
		return entry !== undefined && now - entry.at < STALE_MS ? entry.guilds : null;
	}

	set(userId: string, guilds: OauthGuild[], now = Date.now()): void {
		this.#entries.delete(userId);
		this.#entries.set(userId, { guilds, at: now });
		// A Map keeps insertion order, so the first key is the one written longest ago.
		const oldest = this.#entries.keys().next();
		if (this.#entries.size > MAX_ENTRIES && oldest.done !== true) this.#entries.delete(oldest.value);
	}

	forget(userId: string): void {
		this.#entries.delete(userId);
	}
}

export const guildLists = new GuildListCache();
