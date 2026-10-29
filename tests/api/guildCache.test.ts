import { GuildListCache, STALE_MS } from "@api/guildCache";

const guilds = [{ id: "900000000000000001", name: "A server", icon: null, permissions: "32" }];

describe("GuildListCache", () => {
	/** An old list is better than an error page, but not one old enough to show a server somebody has left. */
	it("stands in with an older list only up to the stale limit", () => {
		const cache = new GuildListCache();
		cache.set("u", guilds, 0);

		expect(cache.stale("u", STALE_MS - 1)).toBe(guilds);
		expect(cache.stale("u", STALE_MS)).toBeNull();
	});
});
