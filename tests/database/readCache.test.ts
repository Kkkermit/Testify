import { ReadCache } from "@database/readCache.util";

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve: (value: T) => void = () => undefined;
	const promise = new Promise<T>((done) => (resolve = done));
	return { promise, resolve };
}

describe("ReadCache", () => {
	it("answers a second read from memory until the entry runs out", async () => {
		jest.useFakeTimers();
		const cache = new ReadCache<string>(1_000);
		const load = jest.fn(() => Promise.resolve("stored"));

		await cache.read("guild", load);
		await cache.read("guild", load);
		jest.advanceTimersByTime(1_001);
		await cache.read("guild", load);
		jest.useRealTimers();

		expect(load).toHaveBeenCalledTimes(2);
	});

	/** A read that left before a save and came back after it kept the old value, so the save looked undone for minutes. */
	it("does not keep a read that a write overtook", async () => {
		const cache = new ReadCache<string>();
		const slow = deferred<string>();

		const reading = cache.read("guild", () => slow.promise);
		cache.forget("guild");
		slow.resolve("before the save");

		expect(await reading).toBe("before the save");
		expect(await cache.read("guild", () => Promise.resolve("after the save"))).toBe("after the save");
	});

	it("keeps what a write says it stored, and forgets on request", async () => {
		const cache = new ReadCache<string>();
		cache.set("guild", "written");

		expect(await cache.read("guild", () => Promise.resolve("read"))).toBe("written");
		cache.forget("guild");
		expect(await cache.read("guild", () => Promise.resolve("read"))).toBe("read");
	});

	it("never holds more than its bound", async () => {
		const cache = new ReadCache<number>(60_000, 3);
		for (const key of ["a", "b", "c", "d", "e"]) await cache.read(key, () => Promise.resolve(1));

		expect(cache.size).toBeLessThanOrEqual(3);
	});
});
