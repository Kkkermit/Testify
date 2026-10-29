import { bodyOf, EMPTY_DRAFT } from "@/features/announcements/announcements.utils";

const CHANNEL = "400000000000000001";

describe("bodyOf", () => {
	/** A form starts at none, so nothing pings unless somebody picked it. */
	it("starts pinging nobody", () => {
		expect(bodyOf({ ...EMPTY_DRAFT, channelId: CHANNEL, message: "Hi" }).mentions).toBe("none");
	});
});
