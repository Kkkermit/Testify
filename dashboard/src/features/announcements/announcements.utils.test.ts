import { announcementSummary, bodyOf, EMPTY_DRAFT } from "@/features/announcements/announcements.utils";
import { currentBotName, i18next } from "@/i18n";

const CHANNEL = "400000000000000001";

describe("bodyOf", () => {
	/** A form starts at none, so nothing pings unless somebody picked it. */
	it("starts pinging nobody", () => {
		expect(bodyOf({ ...EMPTY_DRAFT, channelId: CHANNEL, message: "Hi" }).mentions).toBe("none");
	});
});

describe("announcementSummary", () => {
	const t = i18next.getFixedT("en");

	/** The sentence above the form is the last thing read before posting, so it names the ping plainly. */
	it("says where the draft goes and whom it pings", () => {
		expect(announcementSummary({ channelId: null, mentions: "none" }, "", t)).toBe(
			`Choose a channel, write the message, and it is posted there as ${currentBotName()}.`,
		);
		expect(announcementSummary({ channelId: "1", mentions: "none" }, "#news", t)).toBe(
			"This is posted in #news, pinging nobody.",
		);
		expect(announcementSummary({ channelId: "1", mentions: "everyone" }, "#news", t)).toBe(
			"This is posted in #news and pings @everyone.",
		);
	});
});
