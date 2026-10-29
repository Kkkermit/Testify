import { tempChannelName, tempVoicePatch } from "@testify/shared";

describe("tempChannelName", () => {
	/** Discord refuses a channel name over 100 characters, and the whole channel with it. */
	it("stays within Discord's 100 characters, and is never empty", () => {
		expect(tempChannelName("{user}", "x".repeat(150))).toHaveLength(100);
		expect(tempChannelName("   ", "Carol")).toBe("Carol's channel");
	});
});

describe("the patches the dashboard sends", () => {
	it("refuses an empty patch, a limit Discord would refuse, and a blank name", () => {
		expect(tempVoicePatch.safeParse({}).success).toBe(false);
		expect(tempVoicePatch.safeParse({ userLimit: 100 }).success).toBe(false);
		expect(tempVoicePatch.safeParse({ nameTemplate: "  " }).success).toBe(false);
		expect(tempVoicePatch.safeParse({ userLimit: 0, nameTemplate: "{user}'s room" }).success).toBe(true);
	});
});
