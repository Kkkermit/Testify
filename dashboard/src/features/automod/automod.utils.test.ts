import { automodSummary } from "@/features/automod/automod.utils";
import { i18next } from "@/i18n";

describe("automodSummary", () => {
	const t = i18next.getFixedT("en");

	/** A rule that is switched off filters nothing, so it is never counted as protecting the server. */
	it("counts only the rules that are on", () => {
		expect(automodSummary([], t)).toBe("There are no AutoMod rules yet, so Discord filters nothing here.");
		expect(automodSummary([{ enabled: false }], t)).toBe("Every AutoMod rule here is switched off.");
		expect(automodSummary([{ enabled: true }, { enabled: false }], t)).toBe(
			"1 AutoMod rule is on, and Discord itself enforces it.",
		);
		expect(automodSummary([{ enabled: true }, { enabled: true }], t)).toBe(
			"2 AutoMod rules are on, and Discord itself enforces them.",
		);
	});
});
