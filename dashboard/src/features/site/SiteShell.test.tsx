import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteShell } from "@/features/site/SiteShell";
import { i18next } from "@/i18n";
import { renderWithProviders } from "@/test/renderWithProviders";

// Reduced motion skips the WebGL backdrop, which jsdom has no canvas to draw.
beforeEach(() => {
	document.documentElement.setAttribute("data-motion", "reduced");
});

afterEach(async () => {
	document.documentElement.removeAttribute("data-motion");
	localStorage.removeItem("testify:locale");
	await i18next.changeLanguage("en");
});

describe("the site's header", () => {
	/** The landing page is where a reader first arrives, so the language is chosen there and kept through sign-in. */
	it("changes the language from the site, and keeps it where the dashboard reads it", async () => {
		const user = userEvent.setup();
		renderWithProviders(<SiteShell />);

		await user.selectOptions(await screen.findByRole("combobox", { name: "Language" }), "de");

		// Once in the header and once in the footer, both now in German.
		expect(await screen.findAllByRole("link", { name: "Doku" })).toHaveLength(2);
		expect(screen.getAllByRole("link", { name: "Quellcode" })).toHaveLength(2);
		expect(localStorage.getItem("testify:locale")).toBe("de");
	});

	/** Theme and language belong to the reader, so the website reaches them without an account. */
	it("links the appearance settings from the header and the footer", async () => {
		renderWithProviders(<SiteShell />);

		const links = await screen.findAllByRole("link", { name: "Appearance" });
		expect(links.map((link) => link.getAttribute("href"))).toEqual(["/appearance", "/appearance"]);
	});
});
