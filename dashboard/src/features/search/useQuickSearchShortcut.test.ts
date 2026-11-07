import { renderHook } from "@testing-library/react";
import { useQuickSearchShortcut } from "@/features/search/useQuickSearchShortcut";

describe("the quick search shortcut", () => {
	/** Chrome's autofill sends a keydown with no key, and reading it threw "Cannot read properties of undefined". */
	it("ignores a keydown that carries no key, and still opens on Ctrl+K and ⌘K", () => {
		const toggle = jest.fn();
		const thrown: unknown[] = [];
		const onError = (event: ErrorEvent): void => {
			thrown.push(event.error);
		};
		window.addEventListener("error", onError);
		renderHook(() => {
			useQuickSearchShortcut(toggle);
		});

		document.dispatchEvent(new Event("keydown"));
		document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true }));
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "K", metaKey: true }));
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, shiftKey: true }));
		window.removeEventListener("error", onError);

		expect(thrown).toEqual([]);
		expect(toggle).toHaveBeenCalledTimes(2);
	});
});
