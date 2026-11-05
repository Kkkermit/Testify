import { featureLook } from "@/config/features";
import { tintFor } from "@/lib/tint";

describe("featureLook", () => {
	/** The API can ship a feature before the dashboard knows about it, and a hole in the grid is worse. */
	it("falls back for a key it has never seen", () => {
		const unknown = featureLook("something-added-later");

		expect(unknown.icon).toBeDefined();
		expect(unknown.tint).toBe("text-muted-foreground");
	});
});

describe("tintFor", () => {
	/** The colour is a recognition aid, so it has to be the same one on every visit. */
	it("gives the same seed the same colour every time", () => {
		expect(tintFor("Testify HQ")).toBe(tintFor("Testify HQ"));
	});
});

const CATEGORIES = [
	"community",
	"economy",
	"casino",
	"fun",
	"games",
	"info",
	"levelling",
	"moderation",
	"settings",
	"music",
	"tickets",
	"giveaway",
	"developer",
	"owner",
];

/** The hues `contrast.test.ts` measures on a card and on a recessed fill, and the neutral grey. */
const MEASURED = new Set(["violet", "amber", "red", "green", "blue", "pink"].map((hue) => `text-hue-${hue}`));

describe("category coverage", () => {
	/** A category with no entry renders every one of its commands under the neutral fallback icon. */
	it("has an icon for every category the bot ships", () => {
		for (const category of CATEGORIES) {
			expect(featureLook(category).icon).not.toBe(featureLook("__unknown__").icon);
		}
	});

	/** The colour is what tells the categories apart on the Commands page, so they cannot all fall into one or two. */
	it("spreads the categories over every hue, each one a colour the contrast test measures", () => {
		const tints = CATEGORIES.map((category) => featureLook(category).tint);
		const unmeasured = tints.filter((tint) => !MEASURED.has(tint) && tint !== "text-muted-foreground");

		expect(unmeasured).toEqual([]);
		expect(new Set(tints).size).toBe(MEASURED.size + 1);
	});
});

describe("the feature grid's links", () => {
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
