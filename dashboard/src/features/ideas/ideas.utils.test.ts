import { ideaSummary, pageCount } from "@/features/ideas/ideas.utils";
import { i18next } from "@/i18n";

describe("the idea board's URL", () => {
	it("never counts fewer than one page", () => {
		expect(pageCount(0, 10)).toBe(1);
		expect(pageCount(21, 10)).toBe(3);
	});
});

describe("ideaSummary", () => {
	const t = i18next.getFixedT("en");

	/** The page opens with this, so a board without a channel must never read as one members can use. */
	it("says where ideas go, or why they go nowhere", () => {
		expect(ideaSummary({ enabled: true, channelId: null }, "#ideas", t)).toBe(
			"The idea board has no channel yet, so members cannot post ideas.",
		);
		expect(ideaSummary({ enabled: false, channelId: "1" }, "#ideas", t)).toBe(
			"The idea board is off. Turned on, members post ideas to #ideas with /idea submit.",
		);
		expect(ideaSummary({ enabled: true, channelId: "1" }, "#ideas", t)).toBe(
			"Members post ideas to #ideas with /idea submit, and vote on each one there.",
		);
	});
});
