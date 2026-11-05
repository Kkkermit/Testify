import { welcomeSummary } from "@/features/welcome/welcome.utils";
import { i18next } from "@/i18n";

describe("welcomeSummary", () => {
	const t = i18next.getFixedT("en");
	const on = { enabled: true, channelId: "1" };

	/** The page opens with this, so neither half may claim a post goes out when it cannot. */
	it("says what happens when somebody joins and when somebody leaves", () => {
		expect(welcomeSummary(on, "#welcome", { ...on, enabled: false }, "#bye", t)).toBe(
			"New members are greeted in #welcome. Goodbyes are off.",
		);
		expect(welcomeSummary({ ...on, channelId: null }, "", on, "#bye", t)).toBe(
			"The greeting has no channel yet, so new members are not greeted. A goodbye is posted in #bye when somebody leaves.",
		);
		expect(welcomeSummary({ ...on, enabled: false }, "#welcome", { ...on, channelId: null }, "", t)).toBe(
			"Greetings are off. The goodbye has no channel yet, so nobody’s leaving is posted.",
		);
	});

	/** The goodbye reads on its own, so the greeting's half is said without waiting for it. */
	it("says the greeting's half alone until the goodbye answers", () => {
		expect(welcomeSummary(on, "#welcome", undefined, "", t)).toBe("New members are greeted in #welcome.");
	});
});
