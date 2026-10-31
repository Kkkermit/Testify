import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SCREEN_ROUTES } from "@testify/shared";
import { routePattern, screenView } from "@/hooks/useScreenView";

/** Only the route pattern is sent, so no server or member id reaches the database. */
describe("routePattern", () => {
	/** A shorter id inside a longer one would otherwise be replaced within it and leave a fragment of a real id. */
	it("replaces the longest value first", () => {
		const pattern = routePattern("/guilds/12345/members/123", { guildId: "12345", userId: "123" });

		expect(pattern).toBe("/guilds/:guildId/members/:userId");
	});

	/** Whatever it returns is what gets stored, so nothing that looks like an id may survive. */
	it("never leaves a snowflake in the result", () => {
		const pattern = routePattern("/guilds/900000000000000001/members/100000000000000002", {
			guildId: "900000000000000001",
			userId: "100000000000000002",
		});

		expect(pattern).not.toMatch(/\d{17,20}/);
	});
});

describe("screenView", () => {
	/** A member's id is never sent on its own: only the server is counted, and only against its pattern. */
	it("sends no server for a screen outside one, and never a member", () => {
		expect(screenView("/commands", {})).toEqual({ route: "/commands" });
		expect(screenView("/owner", { userId: "100000000000000002" })).toEqual({ route: "/owner" });
	});

	it("leaves out a server id the API would refuse, so the screen is still counted", () => {
		expect(screenView("/guilds/abc", { guildId: "abc" })).toEqual({ route: "/guilds/:guildId" });
	});
});

/** The website's pages, which no screen view is counted for; every other route is a dashboard screen. */
const SITE_PAGES = new Set([
	"/",
	"/docs",
	"/docs/:slug",
	"/docs/guides/:articleId",
	"/source-code/*",
	"/sign-in",
	"/terms",
	"/privacy",
	"*",
]);

describe("the screens a view may be counted against", () => {
	/** A screen missing from the list is refused by the API, so its views would vanish without a word. */
	it("are exactly the screens the dashboard routes to", () => {
		const routes = readFileSync(resolve(__dirname, "..", "routes.tsx"), "utf8");
		const screens = [...routes.matchAll(/path: "([^"]+)"/g)]
			.map(([, path]) => path ?? "")
			.filter((path) => !SITE_PAGES.has(path));

		expect([...SCREEN_ROUTES].sort()).toEqual(screens.sort());
	});

	it("sends nothing for a path that is not a screen", () => {
		expect(screenView("/guilds/900000000000000001/levelling/", { guildId: "900000000000000001" })).toBeNull();
	});
});
