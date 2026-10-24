import { STARBOARD_LIMITS } from "@testify/shared";
import { thresholdFrom } from "@/features/starboard/starboard.utils";

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
