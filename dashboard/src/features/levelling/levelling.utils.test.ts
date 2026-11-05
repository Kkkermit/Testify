import { levellingSummary } from "@/features/levelling/levelling.utils";
import { i18next } from "@/i18n";

describe("levellingSummary", () => {
	const t = i18next.getFixedT("en");
	const on = { enabled: true, announce: true, levelUpChannelId: "1" };

	/** The page opens with this, so it must say where a level-up goes, or that it goes nowhere. */
	it("says whether XP is earned and where a level-up is announced", () => {
		expect(levellingSummary({ ...on, enabled: false }, "#levels", t)).toBe("Levelling is off, so nobody earns XP.");
		expect(levellingSummary({ ...on, announce: false }, "#levels", t)).toBe(
			"Members earn XP as they talk, and level-ups are not announced.",
		);
		expect(levellingSummary({ ...on, levelUpChannelId: null }, "", t)).toBe(
			"Members earn XP as they talk, and each level-up is announced where they are talking.",
		);
		expect(levellingSummary(on, "#levels", t)).toBe(
			"Members earn XP as they talk, and each level-up is announced in #levels.",
		);
	});
});
