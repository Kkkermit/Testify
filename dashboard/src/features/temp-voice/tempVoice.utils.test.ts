import { TEMP_VOICE_LIMITS } from "@testify/shared";
import { nameTemplateFrom, userLimitFrom, tempVoiceSummary } from "@/features/temp-voice/tempVoice.utils";
import { i18next } from "@/i18n";

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
	it("refuses an empty pattern and one past the length the API takes", () => {
		expect(nameTemplateFrom("   ")).toBeNull();
		expect(nameTemplateFrom("x".repeat(TEMP_VOICE_LIMITS.maxTemplate))).toHaveLength(TEMP_VOICE_LIMITS.maxTemplate);
		expect(nameTemplateFrom("x".repeat(TEMP_VOICE_LIMITS.maxTemplate + 1))).toBeNull();
	});
});

describe("tempVoiceSummary", () => {
	const t = i18next.getFixedT("en");

	/** The page opens with this, so a lobby that makes nothing must never read as working. */
	it("says what joining the lobby does, or that there is no lobby", () => {
		expect(tempVoiceSummary({ enabled: true, lobbyChannelId: null }, "Lobby", t)).toBe(
			"Join to create has no lobby yet, so nobody gets a voice channel of their own.",
		);
		expect(tempVoiceSummary({ enabled: false, lobbyChannelId: "1" }, "Lobby", t)).toBe(
			"Join to create is off. Turned on, joining Lobby gives each member a voice channel of their own.",
		);
		expect(tempVoiceSummary({ enabled: true, lobbyChannelId: "1" }, "Lobby", t)).toBe(
			"Joining Lobby gives each member a voice channel of their own, deleted once it empties.",
		);
	});
});
