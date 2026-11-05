import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearancePage } from "@/features/appearance/AppearancePage";
import { storedPreference } from "@/hooks/rootPreference";
import { MOTION } from "@/hooks/useMotion";
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
	for (const attribute of ["data-theme", "data-accent", "data-motion", "style"]) {
		document.documentElement.removeAttribute(attribute);
	}
});

describe("choosing a theme", () => {
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

		const mocks = screen.getByRole("region", { name: "Theme" }).querySelectorAll("[data-scheme]");
		expect([...mocks].map((mock) => mock.getAttribute("data-scheme"))).toEqual(["light", "dark", "light", "dark"]);
		expect(container.querySelector('[style*="color-scheme"]')).toBeNull();
	});
});

describe("choosing an accent", () => {
	/** Each swatch paints itself in its own accent, whatever the page is wearing. */
	it("shows every swatch in its own colours", async () => {
		render();
		const plum = await screen.findByRole("button", { name: "Plum" });

		expect(plum).toHaveAttribute("data-accent", "plum");
		expect(screen.getByRole("button", { name: "Amber" })).toHaveAttribute("data-accent", "amber");
	});

	/** A typed colour is applied once it is read, and kept apart from the swatches so choosing one does not forget it. */
	it("wears a colour typed as RGB, and remembers it beside the swatches", async () => {
		const user = userEvent.setup();
		render();

		await user.type(await screen.findByRole("textbox", { name: "Colour" }), "67, 56, 202");
		await user.click(screen.getByRole("button", { name: "Use this colour" }));

		const root = document.documentElement;
		expect(root).toHaveAttribute("data-accent", "custom");
		expect(root.style.getPropertyValue("--custom-primary-light")).toBe("#4338ca");
		expect(screen.getByText("In use")).toBeInTheDocument();
		expect(screen.getByText("hsl(245, 58%, 51%)")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Teal" }));
		expect(root).toHaveAttribute("data-accent", "teal");
		expect(window.localStorage.getItem("testify:accent-colour")).toBe("#4338ca");
		expect(screen.queryByText("In use")).toBeNull();
	});

	it("wears a colour from the picker as soon as it is picked", async () => {
		render();

		fireEvent.input(await screen.findByLabelText("Pick a colour"), { target: { value: "#0f766e" } });

		expect(document.documentElement).toHaveAttribute("data-accent", "custom");
		expect(document.documentElement.style.getPropertyValue("--custom-primary-light")).toBe("#0f766e");
		expect(screen.getByRole("textbox", { name: "Colour" })).toHaveValue("#0f766e");
	});

	/** The field never renders what was typed as markup, keeps no character a colour cannot hold, and applies nothing. */
	it("strips markup from what was typed, and refuses it rather than wearing it", async () => {
		const user = userEvent.setup();
		const { container } = render();
		const field = await screen.findByRole("textbox", { name: "Colour" });

		await user.click(field);
		await user.paste('#8b2c6b"><img src=x onerror=alert(1)>');
		await user.click(screen.getByRole("button", { name: "Use this colour" }));

		expect(container.querySelector("img")).toBeNull();
		expect((field as HTMLInputElement).value).not.toMatch(/[<>"=]/);
		expect(screen.getByText(/That isn’t a colour this page can read/)).toBeInTheDocument();
		expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
		expect(document.documentElement.getAttribute("style") ?? "").toBe("");
		expect(window.localStorage.getItem("testify:accent-colour")).toBeNull();
	});

	/** The picker's value can be set by a script as well as by the browser, so it is read like anything typed. */
	it("never wears a string a script set on the picker", async () => {
		render();

		fireEvent.input(await screen.findByLabelText("Pick a colour"), { target: { value: "red;background:url(x)" } });

		// The browser turns a value that is not a colour into black before the page ever reads it.
		expect(document.documentElement.getAttribute("style") ?? "").not.toMatch(/url|red|background/);
		expect(window.localStorage.getItem("testify:accent-colour") ?? "#000000").toMatch(/^#[0-9a-f]{6}$/);
	});

	it("says so when what was typed is not a colour, and leaves the accent alone", async () => {
		const user = userEvent.setup();
		render();

		await user.type(await screen.findByRole("textbox", { name: "Colour" }), "aubergine");
		await user.click(screen.getByRole("button", { name: "Use this colour" }));

		expect(screen.getByText(/That isn’t a colour this page can read/)).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Colour" })).toHaveAttribute("aria-invalid", "true");
		expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
	});
});

describe("choosing how much motion to allow", () => {
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

describe("arriving from the sidebar's language button", () => {
	/** Opening the language section focuses it rather than the top of the page. */
	it("lands focus on the language section rather than the top of the page", () => {
		renderWithProviders(<AppearancePage />, { path: "/appearance", route: "/appearance#language" });

		expect(screen.getByRole("region", { name: "Language" })).toHaveFocus();
	});
});

describe("AppearancePage accessibility", () => {
	/** With a colour of the reader's own, so its samples and read-outs are part of the page being checked. */
	it("has no automatically detectable violations", async () => {
		window.localStorage.setItem("testify:accent-colour", "#4338ca");
		const { container } = render();
		await group("Theme");
		expect(screen.getByText("rgb(67, 56, 202)")).toBeInTheDocument();

		await expectNoViolations(container);
	});
});
