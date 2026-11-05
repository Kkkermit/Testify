import { STARBOARD_LIMITS } from "@testify/shared";
import { starboardSummary, thresholdFrom } from "@/features/starboard/starboard.utils";
import { i18next } from "@/i18n";

describe("thresholdFrom", () => {
	it("reads a whole number inside the limits, ignoring the space around it", () => {
		expect(thresholdFrom(" 5 ")).toBe(5);
		expect(thresholdFrom(String(STARBOARD_LIMITS.minThreshold))).toBe(STARBOARD_LIMITS.minThreshold);
		expect(thresholdFrom(String(STARBOARD_LIMITS.maxThreshold))).toBe(STARBOARD_LIMITS.maxThreshold);
	});

	/** An empty box is Number("") — zero — which would otherwise save a board nothing can reach. */
	it("refuses an empty box, a fraction and anything past either end", () => {
		expect(thresholdFrom("")).toBeNull();
		expect(thresholdFrom("   ")).toBeNull();
		expect(thresholdFrom("2.5")).toBeNull();
		expect(thresholdFrom("ten")).toBeNull();
		expect(thresholdFrom(String(STARBOARD_LIMITS.minThreshold - 1))).toBeNull();
		expect(thresholdFrom(String(STARBOARD_LIMITS.maxThreshold + 1))).toBeNull();
	});
});

describe("starboardSummary", () => {
	const t = i18next.getFixedT("en");
	const board = { enabled: true, channelId: "1", threshold: 3, selfStar: false };

	/** The sentence is the first thing on the page, so it must never claim a board works when it cannot. */
	it("says what happens for each state the board can be in", () => {
		expect(starboardSummary({ ...board, channelId: null }, "#stars", t)).toBe(
			"The starboard has no channel yet, so nothing is reposted.",
		);
		expect(starboardSummary({ ...board, enabled: false }, "#stars", t)).toBe(
			"The starboard is off. Turned on, it reposts to #stars.",
		);
		expect(starboardSummary(board, "#stars", t)).toBe(
			"A message that collects 3 ⭐ is reposted to #stars, not counting the author’s own star.",
		);
		expect(starboardSummary({ ...board, selfStar: true }, "#stars", t)).toBe(
			"A message that collects 3 ⭐ is reposted to #stars, counting the author’s own star.",
		);
	});
});
