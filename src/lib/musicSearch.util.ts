import { formatClock, truncate } from "@lib/format.util";
import { type Track } from "@lib/musicQueue.util";

/** Feeding `/play`'s autocomplete without spawning a process for every keystroke. */

/** Discord refuses a choice whose name or value is longer than this. */
export const CHOICE_MAX = 100;

/** Below this, a search is mostly noise and costs a round trip per letter. */
export const MIN_SEARCH_LENGTH = 3;

export const MAX_CHOICES = 25;

/** Long enough to cover somebody typing a title, short enough that a new upload still turns up. */
export const CACHE_TTL_MS = 300_000;

/** Bounded, so a busy guild cannot grow this until the process runs out of memory. */
export const CACHE_MAX_ENTRIES = 200;

export interface Choice {
	name: string;
	value: string;
}

/**
 * One track as an autocomplete row.
 *
 * The value is the address, so picking a result skips searching for it again — and a track whose address will
 * not fit is dropped, because a truncated URL is a broken one.
 */
export function choiceFor(track: Track): Choice | null {
	if (track.url.length > CHOICE_MAX) return null;

	const length = track.durationMs === null ? "live" : formatClock(track.durationMs);
	const author = track.author === null ? "" : ` · ${track.author}`;
	const name = truncate(`${track.title}${author} (${length})`, CHOICE_MAX);

	return { name, value: track.url };
}

export function choicesFor(tracks: Track[]): Choice[] {
	return tracks
		.map(choiceFor)
		.filter((choice): choice is Choice => choice !== null)
		.slice(0, MAX_CHOICES);
}

/** The row offered when there is nothing better: pressing enter searches for exactly what was typed. */
export function literalChoice(query: string): Choice {
	return { name: truncate(`Search for “${query}”`, CHOICE_MAX), value: truncate(query, CHOICE_MAX) };
}

export function shouldSearch(query: string): boolean {
	return query.trim().length >= MIN_SEARCH_LENGTH;
}

interface Entry {
	choices: Choice[];
	at: number;
}

/**
 * A bounded, expiring cache keyed on the typed text.
 *
 * Autocomplete fires on every keystroke, so without this a ten-letter title is ten searches. Insertion order
 * is the eviction order, which is what `Map` already gives.
 */
export class SearchCache {
	readonly #entries = new Map<string, Entry>();
	readonly #ttlMs: number;
	readonly #max: number;

	constructor(ttlMs = CACHE_TTL_MS, max = CACHE_MAX_ENTRIES) {
		this.#ttlMs = ttlMs;
		this.#max = max;
	}

	get size(): number {
		return this.#entries.size;
	}

	static key(query: string): string {
		return query.trim().toLowerCase();
	}

	get(query: string, now = Date.now()): Choice[] | null {
		const key = SearchCache.key(query);
		const entry = this.#entries.get(key);
		if (entry === undefined) return null;

		if (now - entry.at > this.#ttlMs) {
			this.#entries.delete(key);
			return null;
		}

		// Re-inserting makes this least-recently-used rather than first-in-first-out.
		this.#entries.delete(key);
		this.#entries.set(key, entry);

		return entry.choices;
	}

	set(query: string, choices: Choice[], now = Date.now()): void {
		const key = SearchCache.key(query);
		this.#entries.delete(key);
		this.#entries.set(key, { choices, at: now });

		while (this.#entries.size > this.#max) {
			const oldest = this.#entries.keys().next();
			if (oldest.done === true) break;
			this.#entries.delete(oldest.value);
		}
	}

	clear(): void {
		this.#entries.clear();
	}
}
