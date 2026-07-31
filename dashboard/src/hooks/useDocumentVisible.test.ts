import { act, renderHook } from "@testing-library/react";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";

function setHidden(hidden: boolean): void {
	Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
	document.dispatchEvent(new Event("visibilitychange"));
}

describe("useDocumentVisible", () => {
	afterEach(() => {
		Object.defineProperty(document, "hidden", { value: false, configurable: true });
	});

	it("starts from whatever the document already is", () => {
		Object.defineProperty(document, "hidden", { value: true, configurable: true });
		expect(renderHook(() => useDocumentVisible()).result.current).toBe(false);
	});

	/** A background tab that keeps rendering WebGL is a laptop's battery, so this is what pauses the loop. */
	it("follows the tab being hidden and shown again", () => {
		const { result } = renderHook(() => useDocumentVisible());
		expect(result.current).toBe(true);

		act(() => {
			setHidden(true);
		});
		expect(result.current).toBe(false);

		act(() => {
			setHidden(false);
		});
		expect(result.current).toBe(true);
	});

	it("stops listening once unmounted", () => {
		const remove = jest.spyOn(document, "removeEventListener");
		renderHook(() => useDocumentVisible()).unmount();

		expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
		remove.mockRestore();
	});
});
