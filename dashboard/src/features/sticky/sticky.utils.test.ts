import { stickySummary } from "@/features/sticky/sticky.utils";
import { i18next } from "@/i18n";

describe("stickySummary", () => {
	const t = i18next.getFixedT("en");

	it("says how many channels keep a message at the bottom", () => {
		expect(stickySummary(0, t)).toBe("No channel has a sticky message yet.");
		expect(stickySummary(1, t)).toBe("1 channel keeps a message at the bottom, posted again as others talk.");
		expect(stickySummary(3, t)).toBe("3 channels keep a message at the bottom, posted again as others talk.");
	});
});
