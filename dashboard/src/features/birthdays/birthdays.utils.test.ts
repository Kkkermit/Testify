import { birthdaySummary } from "@/features/birthdays/birthdays.utils";
import { i18next } from "@/i18n";

describe("birthdaySummary", () => {
	const t = i18next.getFixedT("en");

	/** The page opens with this, so birthdays with nowhere to go must never read as being posted. */
	it("says where birthdays are posted, or why none are", () => {
		expect(birthdaySummary({ enabled: true, channelId: null }, "#general", t)).toBe(
			"Birthdays have no channel yet, so none are posted.",
		);
		expect(birthdaySummary({ enabled: false, channelId: "1" }, "#general", t)).toBe(
			"Birthday posts are off. Turned on, each shared birthday is posted in #general on the day.",
		);
		expect(birthdaySummary({ enabled: true, channelId: "1" }, "#general", t)).toBe(
			"Each shared birthday is posted in #general on the day.",
		);
	});
});
