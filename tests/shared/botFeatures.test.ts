import { BOT_FEATURES, overviewIsOff, pathUnder, routeIsOff, screenIsOff, switchedOff } from "@testify/shared";

describe("switching features off", () => {
	/** The casino takes its stakes from the economy's wallets, so it cannot run without it. */
	it("takes every feature that needs one along with it, and says why", () => {
		const { off, pulled } = switchedOff(["economy"]);

		expect([...off].sort()).toEqual(["casino", "economy", "lottery", "treasure"]);
		expect(pulled).toEqual(expect.arrayContaining([{ feature: "casino", because: "economy" }]));
		expect(switchedOff([]).off.size).toBe(0);
	});

	it("matches a path under a pattern by whole segments, with a :name matching any one", () => {
		const cases = [
			["/guilds/:guildId/music", "/guilds/123/music", true],
			["/guilds/:guildId/music", "/guilds/123/music/settings", true],
			["/guilds/:guildId/music", "/guilds//123/music/", true],
			["/guilds/:guildId/music", "/guilds/123/musical", false],
			["/guilds/:guildId/music", "/guilds/123", false],
			["/appeals", "/appeals/400000000000000004", true],
		] as const;

		expect(cases.filter(([pattern, path, under]) => pathUnder(pattern, path) !== under)).toEqual([]);
	});

	it("names the off feature a route, a screen or an overview row belongs to, and only an off one", () => {
		const off = switchedOff(["music", "tickets"]).off;

		expect(routeIsOff(off, "/control/music")).toBe("music");
		expect(routeIsOff(off, "/guilds/1/welcome")).toBeNull();
		expect(screenIsOff(off, "/guilds/1/tickets")).toBe("tickets");
		expect(screenIsOff(switchedOff([]).off, "/guilds/1/tickets")).toBeNull();
		expect(overviewIsOff(off, "tickets")).toBe(true);
		expect(overviewIsOff(off, "levelling")).toBe(false);
	});

	it("never has a feature need itself, which would switch it off for good", () => {
		const selfish = Object.entries(BOT_FEATURES).filter(([key, parts]) =>
			(parts.requires ?? []).some((need) => need === key),
		);

		expect(selfish).toEqual([]);
	});
});
