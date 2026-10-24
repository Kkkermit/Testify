import { starboardPatch, tempChannelName, tempVoicePatch } from "@testify/shared";

describe("tempChannelName", () => {
	it("puts the joiner's name in the template", () => {
		expect(tempChannelName("{user}'s channel", "Alice")).toBe("Alice's channel");
		expect(tempChannelName("🎮 {user} + friends", "Bob")).toBe("🎮 Bob + friends");
	});

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

	it("keeps the starboard's threshold in range", () => {
		expect(starboardPatch.safeParse({ threshold: 0 }).success).toBe(false);
		expect(starboardPatch.safeParse({ threshold: 51 }).success).toBe(false);
		expect(starboardPatch.safeParse({ threshold: 3, selfStar: true }).success).toBe(true);
		expect(starboardPatch.safeParse({}).success).toBe(false);
	});
});
