import { renderHook } from "@testing-library/react";
import { easeOutCubic, useCountUp } from "@/hooks/useCountUp";

describe("easeOutCubic", () => {
	/** Most of the distance is covered early, which is what makes it land softly. */
	it("is past halfway before halfway", () => {
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
	});
});

describe("useCountUp", () => {
	/** Nobody who asked for less motion wants to watch a number spin, and zero is the wrong first paint. */
	it("shows the value immediately under reduced motion", () => {
		window.matchMedia = jest.fn().mockReturnValue({
			matches: true,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		});

		expect(renderHook(() => useCountUp(500)).result.current).toBe(500);
	});
});
