import { applyStoredPreferences } from "@/hooks/preferences";

beforeEach(() => {
	window.localStorage.clear();
	for (const attribute of ["data-theme", "data-accent", "data-motion", "style"]) {
		document.documentElement.removeAttribute(attribute);
	}
});

/** Stored choices apply before the app mounts, not only once the appearance page is opened. */
describe("applying stored preferences before the app mounts", () => {
	it("marks the page with every choice that was remembered", () => {
		window.localStorage.setItem("testify:theme", "light");
		window.localStorage.setItem("testify:accent", "teal");
		window.localStorage.setItem("testify:motion", "reduced");

		applyStoredPreferences();

		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
		expect(document.documentElement.getAttribute("data-accent")).toBe("teal");
		expect(document.documentElement.getAttribute("data-motion")).toBe("reduced");
	});

	/** An unmarked page is what lets the stylesheet answer on its own, so a default must not write an attribute. */
	it("leaves the page unmarked when nothing has been chosen", () => {
		applyStoredPreferences();

		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
		expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
		expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
	});

	it("ignores a stored value that is not one of the options", () => {
		window.localStorage.setItem("testify:accent", "aubergine");

		applyStoredPreferences();

		expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
	});

	/** A colour of somebody's own is worn from the first screen, not only once Appearance is opened. */
	it("wears a remembered colour of the reader's own", () => {
		window.localStorage.setItem("testify:accent", "custom");
		window.localStorage.setItem("testify:accent-colour", "#4338ca");

		applyStoredPreferences();

		const root = document.documentElement;
		expect(root.getAttribute("data-accent")).toBe("custom");
		expect(root.style.getPropertyValue("--custom-primary-light")).toBe("#4338ca");
		expect(root.style.getPropertyValue("--custom-accent-dark")).not.toBe("");
	});

	/** Storage holds whatever was last written to it, and a value reaching a style property must be a colour. */
	it("ignores a remembered colour that is not one, and falls back to plum", () => {
		window.localStorage.setItem("testify:accent", "custom");
		window.localStorage.setItem("testify:accent-colour", "red; background: url(x)");

		applyStoredPreferences();

		expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
		expect(document.documentElement.style.getPropertyValue("--custom-primary-light")).toBe("");
	});
});
