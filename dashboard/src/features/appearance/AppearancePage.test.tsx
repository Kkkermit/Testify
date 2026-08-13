import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearancePage } from "@/features/appearance/AppearancePage";
import { applyTheme, storedTheme } from "@/hooks/useTheme";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

function render() {
	return renderWithProviders(<AppearancePage />, { path: "/appearance" });
}

beforeEach(() => {
	window.localStorage.clear();
	document.documentElement.removeAttribute("data-theme");
});

describe("choosing a theme", () => {
	it("starts on system, so the browser's own setting is what decides", async () => {
		render();

		expect(await screen.findByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");
	});

	/**
	 * `system` has to remove the attribute rather than set one: `color-scheme: light dark` on `:root` is what
	 * follows the device, and any value at all would override it.
	 */
	it("marks the page with an explicit choice, and unmarks it for system", async () => {
		const user = userEvent.setup();
		render();

		await user.click(await screen.findByRole("button", { name: "Light" }));
		expect(document.documentElement).toHaveAttribute("data-theme", "light");

		await user.click(screen.getByRole("button", { name: "System" }));
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
	});

	it("remembers the choice for the next visit", async () => {
		const user = userEvent.setup();
		render();

		await user.click(await screen.findByRole("button", { name: "Dark" }));

		expect(storedTheme()).toBe("dark");
	});

	/** Each sample forces its own `color-scheme`, which is what makes a light preview light on a dark page. */
	it("shows a sample of each theme in its own colours", async () => {
		render();
		await screen.findByRole("button", { name: "System" });

		const samples = screen.getAllByRole("figure");
		expect(samples).toHaveLength(3);
		expect(samples.map((sample) => sample.textContent)).toEqual(["System", "Light", "Dark"]);
	});
});

describe("storedTheme", () => {
	it("falls back to system for anything that is not a theme", () => {
		window.localStorage.setItem("testify:theme", "aubergine");

		expect(storedTheme()).toBe("system");
	});
});

describe("applyTheme", () => {
	it("replaces a previous choice rather than adding to it", () => {
		applyTheme("dark");
		applyTheme("light");

		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
	});
});

describe("AppearancePage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = render();
		await screen.findByRole("button", { name: "System" });

		await expectNoViolations(container);
	});
});
