import { TEMP_VOICE_LIMITS } from "@testify/shared";
import { nameTemplateFrom, userLimitFrom } from "@/features/temp-voice/tempVoice.utils";

describe("userLimitFrom", () => {
	it("reads no limit and Discord's own cap", () => {
		expect(userLimitFrom("0")).toBe(0);
		expect(userLimitFrom(" 4 ")).toBe(4);
		expect(userLimitFrom(String(TEMP_VOICE_LIMITS.maxUserLimit))).toBe(TEMP_VOICE_LIMITS.maxUserLimit);
	});

	/** Number("") is zero, so an emptied box would otherwise quietly remove the limit. */
	it("refuses an empty box, a fraction, a negative and anything past the cap", () => {
		expect(userLimitFrom("")).toBeNull();
		expect(userLimitFrom("1.5")).toBeNull();
		expect(userLimitFrom("-1")).toBeNull();
		expect(userLimitFrom(String(TEMP_VOICE_LIMITS.maxUserLimit + 1))).toBeNull();
	});
});

describe("nameTemplateFrom", () => {
	it("trims the pattern it saves", () => {
		expect(nameTemplateFrom("  {user}'s room ")).toBe("{user}'s room");
	});

	it("refuses an empty pattern and one past the length the API takes", () => {
		expect(nameTemplateFrom("   ")).toBeNull();
		expect(nameTemplateFrom("x".repeat(TEMP_VOICE_LIMITS.maxTemplate))).toHaveLength(TEMP_VOICE_LIMITS.maxTemplate);
		expect(nameTemplateFrom("x".repeat(TEMP_VOICE_LIMITS.maxTemplate + 1))).toBeNull();
	});
});
