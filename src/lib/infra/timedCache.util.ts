/** One answer per key for a while; a request already on its way is shared, and a failed one is not kept. */
export class TimedCache<T> {
	readonly #entries = new Map<string, { at: number; value: Promise<T> }>();

	constructor(
		readonly ttlMs: number,
		readonly maxEntries = Number.POSITIVE_INFINITY,
		readonly now: () => number = Date.now,
	) {}

	get(key: string, load: () => Promise<T>): Promise<T> {
		const found = this.#entries.get(key);
		if (found !== undefined && this.now() - found.at < this.ttlMs) return found.value;

		const value = load();
		this.#entries.delete(key);
		this.#entries.set(key, { at: this.now(), value });
		void value.catch(() => {
			if (this.#entries.get(key)?.value === value) this.#entries.delete(key);
		});

		for (const oldest of this.#entries.keys()) {
			if (this.#entries.size <= this.maxEntries) break;
			this.#entries.delete(oldest);
		}
		return value;
	}

	clear(): void {
		this.#entries.clear();
	}
}
