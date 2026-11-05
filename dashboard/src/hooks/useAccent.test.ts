import { act, renderHook } from "@testing-library/react";
import { applyCustomColour, useCustomColour } from "@/hooks/useAccent";

beforeEach(() => {
	window.localStorage.clear();
	document.documentElement.removeAttribute("style");
});

/** Whoever calls these and with whatever string, only six hex digits reach a style property or storage. */
describe("a colour of the reader's own", () => {
	it("refuses to remember or wear anything that is not a colour", () => {
		const { result } = renderHook(() => useCustomColour());

		let accepted = true;
		act(() => {
			accepted = result.current.setColour("red; background: url(https://example.com/x)");
		});

		expect(accepted).toBe(false);
		expect(result.current.colour).toBeNull();
		expect(window.localStorage.getItem("testify:accent-colour")).toBeNull();
		expect(document.documentElement.getAttribute("style") ?? "").toBe("");
	});

	it("writes nothing onto the page for a value that is not six hex digits", () => {
		applyCustomColour("#8b2c6b; --x: url(y)");

		expect(document.documentElement.getAttribute("style") ?? "").toBe("");
	});

	it("remembers and wears a colour in the one form it reads back", () => {
		const { result } = renderHook(() => useCustomColour());

		act(() => {
			result.current.setColour("#4338ca");
		});

		expect(result.current.colour).toBe("#4338ca");
		expect(window.localStorage.getItem("testify:accent-colour")).toBe("#4338ca");
		expect(document.documentElement.style.getPropertyValue("--custom-primary-light")).toBe("#4338ca");
	});
});
