import { renderHook, waitFor } from "@testing-library/react";
import { countUpValue, easeOutCubic, useCountUp } from "@/hooks/useCountUp";

describe("easeOutCubic", () => {
	it("runs from nothing to everything", () => {
		expect(easeOutCubic(0)).toBe(0);
		expect(easeOutCubic(1)).toBe(1);
	});

	/** Most of the distance is covered early, which is what makes it land softly. */
	it("is past halfway before halfway", () => {
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
	});
});

describe("countUpValue", () => {
	it("holds at the ends rather than overshooting a progress outside 0..1", () => {
		expect(countUpValue(0, 100, -3)).toBe(0);
		expect(countUpValue(0, 100, 4)).toBe(100);
	});

	it("counts down as readily as up", () => {
		expect(countUpValue(100, 0, 1)).toBe(0);
	});

	it("returns whole numbers, because a fractional member count is nonsense", () => {
		expect(Number.isInteger(countUpValue(0, 7, 0.37))).toBe(true);
	});
});

describe("useCountUp", () => {
	it("arrives at its target", async () => {
		const { result } = renderHook(() => useCountUp(1_234, 20));
		await waitFor(() => {
			expect(result.current).toBe(1_234);
		});
	});

	/** Nobody who asked for less motion wants to watch a number spin, and zero is the wrong first paint. */
	it("shows the value immediately under reduced motion", () => {
		window.matchMedia = jest.fn().mockReturnValue({
			matches: true,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		});

		expect(renderHook(() => useCountUp(500)).result.current).toBe(500);
	});

	it("goes straight there when given no duration", () => {
		expect(renderHook(() => useCountUp(42, 0)).result.current).toBe(42);
	});

	it("follows a target that changes mid-flight", async () => {
		const { result, rerender } = renderHook(({ to }) => useCountUp(to, 20), { initialProps: { to: 10 } });

		rerender({ to: 99 });
		await waitFor(() => {
			expect(result.current).toBe(99);
		});
	});
});
