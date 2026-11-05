import { openToTheBlacklisted } from "@api/middleware/blacklist";

/** The routes a blocked account keeps, matched whole, so a route added later beside them is closed until listed. */
describe("what a blacklisted account may still reach", () => {
	it("is the public routes, who it is, signing out and deleting its data, each matched exactly", () => {
		const cases: [string, string, boolean][] = [
			["GET", "/api/auth/me", true],
			["POST", "/api/auth/erase", true],
			["POST", "/api/auth/logout", true],
			["POST", "/api/auth/logout-all", true],
			["GET", "/api/health", true],
			["GET", "/api/bot", true],
			["GET", "/api/site/tree", true],
			["GET", "/api/support/articles/levelling", true],
			["GET", "/api/auth/meh", false],
			["GET", "/api/auth/me/sessions", false],
			["POST", "/api/auth/erase-everyone", false],
			["GET", "/api/auth/erase", false],
			["POST", "/api/auth/me", false],
			["GET", "/api/bots", false],
			["GET", "/api/sitemap", false],
			["POST", "/api/support/ask", false],
			["GET", "/api/support/articles/levelling/edit", false],
			["GET", "/api/account/profile", false],
			["GET", "/api/guilds", false],
			["DELETE", "/api/health", false],
		];

		expect(cases.filter(([method, path, open]) => openToTheBlacklisted(method, path) !== open)).toEqual([]);
	});
});
