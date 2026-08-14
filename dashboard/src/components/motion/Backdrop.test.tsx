import { act, render } from "@testing-library/react";
import { Backdrop, supportsWebgl } from "@/components/motion/Backdrop";
import { createStarfield } from "@/lib/three/starfield";

jest.mock("@/lib/three/starfield", () => ({ createStarfield: jest.fn() }));

function withContext(context: unknown): jest.SpyInstance {
	return jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);
}

function reducedMotion(matches: boolean): void {
	window.matchMedia = jest.fn().mockReturnValue({
		matches,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
	});
}

describe("supportsWebgl", () => {
	it("is false where there is no context to get, which is every test run", () => {
		const spy = withContext(null);
		expect(supportsWebgl()).toBe(false);
		spy.mockRestore();
	});

	it("is true when a context comes back", () => {
		const spy = withContext({});
		expect(supportsWebgl()).toBe(true);
		spy.mockRestore();
	});

	/** Some hardened browsers throw from getContext rather than returning null, and a decoration must not care. */
	it("is false when getContext throws", () => {
		const spy = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
			throw new Error("blocked");
		});

		expect(supportsWebgl()).toBe(false);
		spy.mockRestore();
	});
});

describe("Backdrop", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("renders nothing at all where WebGL is unavailable", () => {
		withContext(null);
		reducedMotion(false);

		expect(render(<Backdrop />).container).toBeEmptyDOMElement();
	});

	/** Asking for less motion has to mean the chunk is never fetched, not merely that it is paused. */
	it("renders nothing under reduced motion, even where WebGL works", () => {
		withContext({});
		reducedMotion(true);

		expect(render(<Backdrop />).container).toBeEmptyDOMElement();
	});

	it("is hidden from assistive technology and cannot take a click", () => {
		withContext({});
		reducedMotion(false);

		const canvas = render(<Backdrop />).container.querySelector("canvas");

		expect(canvas).toHaveAttribute("aria-hidden", "true");
		expect(canvas).toHaveClass("pointer-events-none");
	});
});

/**
 * The palette is chosen on the appearance page while this is on screen, so a field holding the colour it
 * started with is a backdrop that disagrees with every other surface until the next reload.
 */
describe("Backdrop following the palette", () => {
	const field = { setRunning: jest.fn(), refresh: jest.fn(), dispose: jest.fn() };

	async function mounted() {
		withContext({});
		reducedMotion(false);
		(createStarfield as jest.Mock).mockReturnValue(field);

		const view = render(<Backdrop />);
		// The starfield is imported dynamically, so it arrives a microtask after the effect runs.
		await act(async () => {
			await Promise.resolve();
		});

		return view;
	}

	beforeEach(() => {
		document.documentElement.removeAttribute("data-theme");
		document.documentElement.removeAttribute("data-accent");
		jest.clearAllMocks();
	});

	it.each(["data-theme", "data-accent"])("re-reads the palette when %s changes", async (attribute) => {
		await mounted();

		await act(async () => {
			document.documentElement.setAttribute(attribute, attribute === "data-theme" ? "light" : "teal");
			await Promise.resolve();
		});

		expect(field.refresh).toHaveBeenCalled();
	});

	it("stops watching once it is gone", async () => {
		const { unmount } = await mounted();
		unmount();

		await act(async () => {
			document.documentElement.setAttribute("data-theme", "light");
			await Promise.resolve();
		});

		expect(field.refresh).not.toHaveBeenCalled();
	});
});
