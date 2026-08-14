import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearancePage } from "@/features/appearance/AppearancePage";
import { storedAccent } from "@/hooks/useAccent";
import { storedMotion } from "@/hooks/useMotion";
import { applyTheme, storedTheme } from "@/hooks/useTheme";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

function render() {
	return renderWithProviders(<AppearancePage />, { path: "/appearance" });
}

/** Theme and motion both offer a segment called "System", so a bare query for one would match either. */
async function group(name: string) {
	return within(await screen.findByRole("group", { name }));
}

beforeEach(() => {
	window.localStorage.clear();
	for (const attribute of ["data-theme", "data-accent", "data-motion"]) {
		document.documentElement.removeAttribute(attribute);
	}
});

describe("choosing a theme", () => {
	it("starts on system, so the browser's own setting is what decides", async () => {
		render();

		expect((await group("Theme")).getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");
	});

	/**
	 * `system` has to remove the attribute rather than set one: `color-scheme: light dark` on `:root` is what
	 * follows the device, and any value at all would override it.
	 */
	it("marks the page with an explicit choice, and unmarks it for system", async () => {
		const user = userEvent.setup();
		render();

		const theme = await group("Theme");

		await user.click(theme.getByRole("button", { name: "Light" }));
		expect(document.documentElement).toHaveAttribute("data-theme", "light");

		await user.click(theme.getByRole("button", { name: "System" }));
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
	});

	it("remembers the choice for the next visit", async () => {
		const user = userEvent.setup();
		render();

		await user.click((await group("Theme")).getByRole("button", { name: "Dark" }));

		expect(storedTheme()).toBe("dark");
	});

	/** Each sample forces its own `color-scheme`, which is what makes a light preview light on a dark page. */
	it("shows a sample of each theme in its own colours", async () => {
		render();
		await group("Theme");

		const samples = screen.getAllByRole("figure");
		expect(samples).toHaveLength(3);
		expect(samples.map((sample) => sample.textContent)).toEqual(["System", "Light", "Dark"]);
	});

	/**
	 * The scheme has to come from an attribute the stylesheet declares, never an inline `style`: nothing in
	 * jsdom can tell the two apart, and inline it silently renders every sample in the page's own theme.
	 */
	it("forces each sample's scheme with an attribute rather than an inline style", async () => {
		const { container } = render();
		await group("Theme");

		const mocks = container.querySelectorAll("[data-scheme]");
		expect([...mocks].map((mock) => mock.getAttribute("data-scheme"))).toEqual(["light", "dark", "light", "dark"]);
		expect(container.querySelector('[style*="color-scheme"]')).toBeNull();
	});
});

describe("choosing an accent", () => {
	it("starts on violet, which is the palette the stylesheet already holds", async () => {
		render();

		expect(await screen.findByRole("button", { name: "Violet" })).toHaveAttribute("aria-pressed", "true");
		expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
	});

	it("marks the page with an explicit choice, and unmarks it for violet", async () => {
		const user = userEvent.setup();
		render();

		await user.click(await screen.findByRole("button", { name: "Teal" }));
		expect(document.documentElement).toHaveAttribute("data-accent", "teal");

		await user.click(screen.getByRole("button", { name: "Violet" }));
		expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
	});

	/**
	 * Each swatch carries its own `data-accent`, which is what makes it paint itself in that accent rather than
	 * in whichever one the page is currently wearing.
	 */
	it("shows every swatch in its own colours", async () => {
		render();
		const violet = await screen.findByRole("button", { name: "Violet" });

		expect(violet).toHaveAttribute("data-accent", "violet");
		expect(screen.getByRole("button", { name: "Amber" })).toHaveAttribute("data-accent", "amber");
	});

	it("remembers the choice for the next visit", async () => {
		const user = userEvent.setup();
		render();

		await user.click(await screen.findByRole("button", { name: "Pink" }));

		expect(storedAccent()).toBe("pink");
	});
});

describe("choosing how much motion to allow", () => {
	it("starts on system, so the device's own setting is what decides", async () => {
		render();

		expect((await group("Motion")).getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");
		expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
	});

	/** The choice has to win in both directions, or somebody who set it for one application is stuck with it here. */
	it.each([
		["Reduced", "reduced"],
		["Full", "full"],
	])("marks the page when %s is chosen", async (label, attribute) => {
		const user = userEvent.setup();
		render();

		await user.click((await group("Motion")).getByRole("button", { name: label }));

		expect(document.documentElement).toHaveAttribute("data-motion", attribute);
		expect(storedMotion()).toBe(attribute);
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
		await group("Theme");

		await expectNoViolations(container);
	});
});
