import { FRESH_MS, GuildListCache, STALE_MS } from "@api/guildCache";

const guilds = [{ id: "900000000000000001", name: "A server", icon: null, permissions: "32" }];

describe("GuildListCache", () => {
	it("reuses a list only inside the fresh window", () => {
		const cache = new GuildListCache();
		cache.set("u", guilds, 0);

		expect(cache.fresh("u", FRESH_MS - 1)).toBe(guilds);
		expect(cache.fresh("u", FRESH_MS)).toBeNull();
	});

	/** An old list is better than an error page, but not one old enough to show a server somebody has left. */
	it("stands in with an older list only up to the stale limit", () => {
		const cache = new GuildListCache();
		cache.set("u", guilds, 0);

		expect(cache.stale("u", STALE_MS - 1)).toBe(guilds);
		expect(cache.stale("u", STALE_MS)).toBeNull();
	});

	it("keeps each person's list apart, and forgets one on request", () => {
		const cache = new GuildListCache();
		cache.set("u", guilds, 0);

		expect(cache.fresh("someone-else", 0)).toBeNull();
		cache.forget("u");
		expect(cache.stale("u", 0)).toBeNull();
	});

	it("drops the oldest entry rather than growing without bound", () => {
		const cache = new GuildListCache();
		for (let index = 0; index <= 1_000; index++) cache.set(String(index), guilds, 0);

		expect(cache.stale("0", 0)).toBeNull();
		expect(cache.stale("1000", 0)).toBe(guilds);
	});
});
