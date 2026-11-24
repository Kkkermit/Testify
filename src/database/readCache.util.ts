import { CACHE } from "@config/constants";

/**
 * What a repository read, kept a while because it is asked on every message or command; a read that a write overtook
 * is answered but not kept, so the cache can never go on holding what the write replaced.
 */
export class ReadCache<T> {
	private readonly entries = new Map<string, { value: T; expiresAt: number }>();
	/** Counts every write, so a read can tell whether one landed while it was waiting on the database. */
	private writes = 0;

	constructor(
		private readonly ttlMs: number = CACHE.guildSettingsTtlMs,
		private readonly maxEntries: number = CACHE.guildSettingsMaxEntries,
	) {}

	async read(key: string, load: () => Promise<T>): Promise<T> {
		const cached = this.entries.get(key);
		if (cached !== undefined && cached.expiresAt > Date.now()) return cached.value;

		const writesBefore = this.writes;
		const value = await load();
		if (this.writes === writesBefore) this.keep(key, value);
		return value;
	}

	/** After a write that knows what it stored. */
	set(key: string, value: T): T {
		this.writes += 1;
		this.keep(key, value);
		return value;
	}

	/** After a write, never before it, or a read in between would keep what the write was replacing. */
	forget(key: string): void {
		this.writes += 1;
		this.entries.delete(key);
	}

	clear(): void {
		this.writes += 1;
		this.entries.clear();
	}

	get size(): number {
		return this.entries.size;
	}

	private keep(key: string, value: T): void {
		// Bounded, so a cache keyed by server or person cannot grow for as long as the bot runs.
		if (this.entries.size >= this.maxEntries && !this.entries.has(key)) this.entries.clear();
		this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
	}
}
