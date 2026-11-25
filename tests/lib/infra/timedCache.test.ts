import { TimedCache } from "@lib/infra/timedCache.util";

describe("TimedCache", () => {
	it("shares a request on its way, keeps the answer for its time, and asks again after it", async () => {
		let now = 0;
		const cache = new TimedCache<number>(1_000, Number.POSITIVE_INFINITY, () => now);
		const load = jest.fn(() => Promise.resolve(1));

		await Promise.all([cache.get("a", load), cache.get("a", load)]);
		now = 999;
		await cache.get("a", load);
		expect(load).toHaveBeenCalledTimes(1);

		now = 1_000;
		await cache.get("a", load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	/** A failure kept for an hour would refuse every reader for an hour after GitHub recovered. */
	it("does not keep a failure", async () => {
		const cache = new TimedCache<number>(1_000);

		await expect(cache.get("a", () => Promise.reject(new Error("down")))).rejects.toThrow("down");
		await expect(cache.get("a", () => Promise.resolve(2))).resolves.toBe(2);
	});

	it("lets go of the oldest answer past its size", async () => {
		const cache = new TimedCache<string>(1_000, 2);
		const load = jest.fn((key: string) => Promise.resolve(key));

		for (const key of ["a", "b", "c", "a"]) await cache.get(key, () => load(key));

		expect(load.mock.calls.map(([key]) => key)).toEqual(["a", "b", "c", "a"]);
	});
});
