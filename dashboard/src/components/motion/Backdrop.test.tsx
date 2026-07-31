import { render } from "@testing-library/react";
import { Backdrop, supportsWebgl } from "@/components/motion/Backdrop";

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
