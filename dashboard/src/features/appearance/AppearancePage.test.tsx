import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearancePage } from "@/features/appearance/AppearancePage";
import { applyPreference, storedPreference } from "@/hooks/rootPreference";
import { ACCENT } from "@/hooks/useAccent";
import { MOTION } from "@/hooks/useMotion";
import { THEME } from "@/hooks/useTheme";
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

	/** `system` removes the attribute, because any value overrides `color-scheme: light dark`. */
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

		expect(storedPreference(THEME)).toBe("dark");
	});

	/** Each sample forces its own `color-scheme`, which is what makes a light preview light on a dark page. */
	it("shows a sample of each theme in its own colours", async () => {
		render();
		await group("Theme");

		const samples = screen.getAllByRole("figure");
		expect(samples).toHaveLength(3);
		expect(samples.map((sample) => sample.textContent)).toEqual(["System", "Light", "Dark"]);
	});

	/** Each sample's scheme comes from an attribute the stylesheet declares, never an inline style. */
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

	/** Each swatch paints itself in its own accent, whatever the page is wearing. */
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

		expect(storedPreference(ACCENT)).toBe("pink");
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
		expect(storedPreference(MOTION)).toBe(attribute);
	});
});

describe("the stored theme", () => {
	it("falls back to system for anything that is not a theme", () => {
		window.localStorage.setItem("testify:theme", "aubergine");

		expect(storedPreference(THEME)).toBe("system");
	});
});

describe("applying a theme", () => {
	it("replaces a previous choice rather than adding to it", () => {
		applyPreference(THEME, "dark");
		applyPreference(THEME, "light");

		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
	});
});

describe("arriving from the sidebar's language button", () => {
	/** Opening the language section focuses it rather than the top of the page. */
	it("lands focus on the language section rather than the top of the page", () => {
		renderWithProviders(<AppearancePage />, { path: "/appearance", route: "/appearance#language" });

		expect(screen.getByRole("region", { name: "Language" })).toHaveFocus();
	});

	it("names every setting as its own region, so each one can be linked to", () => {
		render();

		for (const name of ["Theme", "Accent colour", "Motion", "Language"]) {
			expect(screen.getByRole("region", { name })).toBeInTheDocument();
		}
	});
});

describe("AppearancePage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = render();
		await group("Theme");

		await expectNoViolations(container);
	});
});
