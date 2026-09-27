import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguagePicker } from "@/components/form/LanguagePicker";
import { i18next, LOCALE_NAMES, LOCALES } from "@/i18n";
import { renderWithProviders } from "@/test/renderWithProviders";

afterEach(async () => {
	await i18next.changeLanguage("en");
});

describe("LanguagePicker", () => {
	it("offers every language Testify carries, named in its own words", () => {
		renderWithProviders(<LanguagePicker />, { path: "/appearance" });

		for (const locale of LOCALES) {
			expect(screen.getByRole("button", { name: LOCALE_NAMES[locale] })).toBeInTheDocument();
		}
	});

	/** A flag is a picture: the endonym beside it is what names the control for anybody not looking at it. */
	it("names each option by its language rather than by its flag", () => {
		renderWithProviders(<LanguagePicker />, { path: "/appearance" });

		const italian = screen.getByRole("button", { name: "Italiano" });

		expect(italian).toHaveAccessibleName("Italiano");
		expect(italian.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	/** `lang` on the name, so a screen reader pronounces Français in French rather than in English. */
	it("marks each name with the language it is written in", () => {
		renderWithProviders(<LanguagePicker />, { path: "/appearance" });

		expect(screen.getByText("Русский")).toHaveAttribute("lang", "ru");
	});

	it("marks the current language as pressed, and no other", () => {
		renderWithProviders(<LanguagePicker />, { path: "/appearance" });

		const pressed = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true");
		expect(pressed).toHaveLength(1);
		expect(pressed[0]).toHaveAccessibleName("English");
	});

	it("switches the language when one is chosen", async () => {
		renderWithProviders(<LanguagePicker />, { path: "/appearance" });

		await userEvent.click(screen.getByRole("button", { name: "Deutsch" }));

		expect(i18next.resolvedLanguage).toBe("de");
	});
});
