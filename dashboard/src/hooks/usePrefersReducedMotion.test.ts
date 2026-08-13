import { act, renderHook } from "@testing-library/react";
import { prefersReducedMotion, usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type Listener = () => void;

function mockMedia(matches: boolean): { fire: (next: boolean) => void; removed: () => boolean } {
	const listeners = new Set<Listener>();
	const media = {
		matches,
		addEventListener: (_event: string, listener: Listener) => listeners.add(listener),
		removeEventListener: (_event: string, listener: Listener) => listeners.delete(listener),
	};

	window.matchMedia = jest.fn().mockReturnValue(media);

	return {
		fire: (next: boolean) => {
			media.matches = next;
			for (const listener of listeners) listener();
		},
		removed: () => listeners.size === 0,
	};
}

// One of these deletes matchMedia outright, so the stub the harness installs is put back for the next test.
afterEach(() => {
	mockMedia(false);
	document.documentElement.removeAttribute("data-motion");
});

describe("prefersReducedMotion", () => {
	/** jsdom and some embedded browsers have no matchMedia, and an ornament must not throw on the way in. */
	it("says no preference when matchMedia is missing entirely", () => {
		// @ts-expect-error deleting a DOM global is the situation being reproduced.
		delete window.matchMedia;

		expect(prefersReducedMotion()).toBe(false);
	});

	it("reports the preference when the query matches", () => {
		mockMedia(true);
		expect(prefersReducedMotion()).toBe(true);
	});
});

describe("usePrefersReducedMotion", () => {
	it("starts from the current preference", () => {
		mockMedia(true);
		expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(true);
	});

	/** Someone turning the preference on in their OS should not have to reload to be taken seriously. */
	it("follows the preference changing while the page is open", () => {
		const media = mockMedia(false);
		const { result } = renderHook(() => usePrefersReducedMotion());

		expect(result.current).toBe(false);

		act(() => {
			media.fire(true);
		});

		expect(result.current).toBe(true);
	});

	it("detaches its listener on unmount", () => {
		const media = mockMedia(false);
		renderHook(() => usePrefersReducedMotion()).unmount();

		expect(media.removed()).toBe(true);
	});
});

/**
 * The stylesheet reads `data-motion` first and the media query second. Anything animating in JavaScript has to
 * resolve them in the same order, or the backdrop keeps drifting behind a page that has been stilled.
 */
describe("the choice on the appearance page", () => {
	it("stills the page on a device that asked for nothing", () => {
		mockMedia(false);
		document.documentElement.setAttribute("data-motion", "reduced");

		expect(prefersReducedMotion()).toBe(true);
	});

	it("restores motion on a device that asked for less", () => {
		mockMedia(true);
		document.documentElement.setAttribute("data-motion", "full");

		expect(prefersReducedMotion()).toBe(false);
	});

	it("hands back to the device when the choice is system", () => {
		mockMedia(true);

		expect(prefersReducedMotion()).toBe(true);
	});

	/** A mutation record is delivered on a microtask, so the assertion has to wait one out. */
	it("reaches a mounted hook without a reload", async () => {
		mockMedia(false);
		const { result } = renderHook(() => usePrefersReducedMotion());

		expect(result.current).toBe(false);

		await act(async () => {
			document.documentElement.setAttribute("data-motion", "reduced");
			await Promise.resolve();
		});

		expect(result.current).toBe(true);
	});
});
