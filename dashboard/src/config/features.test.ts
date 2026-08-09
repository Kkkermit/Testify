import { featureLook } from "@/config/features";
import { tintFor } from "@/lib/tint";

describe("featureLook", () => {
	it("gives a feature its own icon and tint", () => {
		const levelling = featureLook("levelling");
		const tickets = featureLook("tickets");

		expect(levelling.icon).not.toBe(tickets.icon);
		expect(levelling.tint).not.toBe(tickets.tint);
	});

	/** The API can ship a feature before the dashboard knows about it, and a hole in the grid is worse. */
	it("falls back for a key it has never seen", () => {
		const unknown = featureLook("something-added-later");

		expect(unknown.icon).toBeDefined();
		expect(unknown.tint).toBe("text-muted-foreground");
	});

	it("pairs every tint with a wash, so an icon always has its backing", () => {
		for (const key of ["levelling", "economy", "moderation", "welcome", "tickets", "unknown"]) {
			const look = featureLook(key);
			expect(look.wash.length).toBeGreaterThan(0);
			expect(look.tint.length).toBeGreaterThan(0);
		}
	});
});

describe("tintFor", () => {
	/** The colour is a recognition aid, so it has to be the same one on every visit. */
	it("gives the same seed the same colour every time", () => {
		expect(tintFor("Testify HQ")).toBe(tintFor("Testify HQ"));
	});

	it("spreads different seeds across the palette", () => {
		const seeds = ["one", "two", "three", "four", "five", "six", "seven", "eight"];
		expect(new Set(seeds.map(tintFor)).size).toBeGreaterThan(1);
	});

	it("always returns a real class pair, including for an empty seed", () => {
		expect(tintFor("")).toMatch(/^bg-\S+ text-\S+$/);
	});
});

describe("category coverage", () => {
	/** A category with no entry renders every one of its commands under the neutral fallback icon. */
	it("has an icon for every category the bot ships", () => {
		const categories = [
			"community",
			"economy",
			"fun",
			"games",
			"info",
			"levelling",
			"moderation",
			"settings",
			"tickets",
			"giveaway",
			"developer",
			"owner",
		];

		// Some categories share the neutral tint on purpose, so the icon is what has to be its own.
		for (const category of categories) {
			expect(featureLook(category).icon).not.toBe(featureLook("__unknown__").icon);
		}
	});
});

describe("the feature grid's links", () => {
	/**
	 * Tickets had a screen at `/guilds/:id/tickets` and no `path` here, so its tile on the overview rendered
	 * as an inert `<div>` — the feature was built, reachable from the sidebar, and dead from the grid.
	 */
	it("links every feature whose screen exists", () => {
		const routed: Record<string, string> = {
			levelling: "levelling",
			welcome: "welcome",
			"audit-logging": "audit-log",
			automod: "automod",
			sticky: "sticky",
			treasure: "treasure",
			tickets: "tickets",
			lottery: "lottery",
		};

		for (const [key, segment] of Object.entries(routed)) {
			const look = featureLook(key);
			expect(look.path).toBeDefined();
			expect(look.path?.("900000000000000001")).toBe(`/guilds/900000000000000001/${segment}`);
		}
	});

	/** A tile pointing at a route that does not exist lands the browser back on the guild picker. */
	it("points only at paths the router serves", () => {
		const served = new Set([
			"levelling",
			"welcome",
			"audit-log",
			"settings",
			"automod",
			"sticky",
			"treasure",
			"tickets",
			"lottery",
			"members",
			"commands",
		]);

		for (const key of [
			"levelling",
			"welcome",
			"audit-logging",
			"automod",
			"sticky",
			"treasure",
			"tickets",
			"lottery",
			"anti-link",
			"auto-roles",
			"voice-stats",
			"verification",
			"counting",
		]) {
			const path = featureLook(key).path?.("900000000000000001");
			if (path === undefined) continue;
			expect(served).toContain(path.split("/").at(-1));
		}
	});
});
