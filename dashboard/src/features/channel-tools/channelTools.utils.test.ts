import { slowmodeChoices } from "@/features/channel-tools/channelTools.utils";

describe("slowmodeChoices", () => {
	it("keeps a length set in Discord that the list does not offer", () => {
		expect(slowmodeChoices(30)).not.toContain(42);
		expect(slowmodeChoices(42)).toContain(42);
		expect(slowmodeChoices(42).indexOf(42)).toBe(slowmodeChoices(42).indexOf(60) - 1);
	});
});
