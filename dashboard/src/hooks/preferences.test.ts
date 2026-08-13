import { applyStoredPreferences } from "@/hooks/preferences";

beforeEach(() => {
	window.localStorage.clear();
	for (const attribute of ["data-theme", "data-accent", "data-motion"]) {
		document.documentElement.removeAttribute(attribute);
	}
});

/**
 * The appearance page is the only screen holding these hooks, so without this call a reader who chose light and
 * then landed on `/guilds` got the system theme back — the choice was remembered and never applied.
 */
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
});
