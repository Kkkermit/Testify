import { formatClock, truncate } from "@lib/format/format.util";
import { CHOICE_MAX } from "@lib/music/music.constants";
import { type Track } from "@lib/music/music.types";

/** Feeding `/play`'s autocomplete without spawning a process for every keystroke. */

/** Below this, a search is mostly noise and costs a round trip per letter. */
const MIN_SEARCH_LENGTH = 3;

export const MAX_CHOICES = 25;

/** Long enough to cover somebody typing a title, short enough that a new upload still turns up. */
const CACHE_TTL_MS = 300_000;

/** Bounded, so a busy guild cannot grow this until the process runs out of memory. */
const CACHE_MAX_ENTRIES = 200;

export interface Choice {
	name: string;
	value: string;
}

/** One track as an autocomplete row whose value is its address; a track whose address will not fit is dropped. */
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

/** A bounded, expiring cache keyed on the typed text; `Map` insertion order is the eviction order. */
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

/** Discord closes an autocomplete interaction three seconds after it was created. */
export const INTERACTION_WINDOW_MS = 3_000;

/** Room for the answer itself to reach Discord, which is a round trip rather than a local call. */
export const RESPONSE_MARGIN_MS = 800;

/** What is left of the window when nothing is known about the interaction's own age. */
const SEARCH_BUDGET_MS = INTERACTION_WINDOW_MS - RESPONSE_MARGIN_MS;

/**
 * How long the interaction has been open: the larger of Discord's clock and this host's, ignoring the snowflake when
 * the two disagree by more than the window.
 */
export function interactionAge(createdTimestamp: number, receivedAt: number, now = Date.now()): number {
	const sinceReceipt = Math.max(0, now - receivedAt);
	const sinceCreated = now - createdTimestamp;
	const plausible = sinceCreated >= 0 && sinceCreated - sinceReceipt < INTERACTION_WINDOW_MS;

	return plausible ? Math.max(sinceReceipt, sinceCreated) : sinceReceipt;
}

export function searchBudget(age: number): number {
	return Math.max(0, INTERACTION_WINDOW_MS - age - RESPONSE_MARGIN_MS);
}

/** Answering a window Discord has already closed is a refused request and a line in the log, for nothing. */
export function stillOpen(age: number): boolean {
	return age < INTERACTION_WINDOW_MS;
}

/** Resolves to `null` when the work has not finished in time, leaving it running rather than cancelling it. */
export async function within<T>(work: Promise<T>, ms: number): Promise<T | null> {
	let timer: NodeJS.Timeout | undefined;
	const deadline = new Promise<null>((resolve) => {
		timer = setTimeout(() => resolve(null), ms);
	});

	try {
		return await Promise.race([work, deadline]);
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Answers autocomplete inside Discord's window; a slow search keeps running to fill the cache for the next keystroke.
 */
export class Suggester {
	readonly #cache: SearchCache;
	readonly #running = new Map<string, Promise<Choice[]>>();
	readonly #budgetMs: number;

	constructor(budgetMs = SEARCH_BUDGET_MS, cache = new SearchCache()) {
		this.#budgetMs = budgetMs;
		this.#cache = cache;
	}

	/** How many searches are still running, which is what proves a burst of keystrokes is one process. */
	get pending(): number {
		return this.#running.size;
	}

	async suggest(query: string, search: () => Promise<Choice[]>, budgetMs = this.#budgetMs): Promise<Choice[]> {
		const cached = this.#cache.get(query);
		if (cached !== null) return cached.length === 0 ? [literalChoice(query)] : cached.slice(0, MAX_CHOICES);

		const key = SearchCache.key(query);
		const finished = await within(this.#running.get(key) ?? this.#start(key, query, search), budgetMs);

		return finished === null || finished.length === 0 ? [literalChoice(query)] : finished.slice(0, MAX_CHOICES);
	}

	#start(key: string, query: string, search: () => Promise<Choice[]>): Promise<Choice[]> {
		const running = search()
			.then((choices) => {
				this.#cache.set(query, choices);
				return choices;
			})
			// A failure is deliberately not cached, so the next keystroke is free to try again.
			.catch((): Choice[] => [])
			.finally(() => this.#running.delete(key));

		this.#running.set(key, running);

		return running;
	}

	clear(): void {
		this.#cache.clear();
		this.#running.clear();
	}
}
