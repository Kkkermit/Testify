import { screen } from "@testing-library/react";
import { allNavItems, navigationFor } from "@/config/navigation";
import { helpAreas } from "@/features/help/help.utils";
import { HelpPage } from "@/features/help/HelpPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

function renderPage() {
	return renderWithProviders(<HelpPage />, { path: "/help", route: "/help" });
}

describe("helpAreas", () => {
	/** The tour is the sidebar's own registry, so a screen added there is explained here without a second edit. */
	it("describes every screen the sidebar offers", () => {
		const items = allNavItems(navigationFor({ guild: { id: "0", name: "" }, isOwner: false }));

		expect(helpAreas(false).map((area) => area.labelKey)).toEqual(items.map((item) => item.labelKey));
	});

	it("includes the owner console only for an owner", () => {
		expect(helpAreas(false).some((area) => area.labelKey === "nav.owner")).toBe(false);
		expect(helpAreas(true).some((area) => area.labelKey === "nav.owner")).toBe(true);
	});
});

describe("HelpPage", () => {
	it("opens on the first thing a new admin has to do", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { level: 1, name: "Getting started" })).toBeInTheDocument();
		expect(screen.getByText("Add the bot to your server")).toBeInTheDocument();
	});

	/** A new admin looking for a command has to be able to get from here to the list of them. */
	it("points at the command list", async () => {
		renderPage();

		expect(await screen.findByRole("link", { name: "Every command, searchable" })).toHaveAttribute("href", "/commands");
	});

	it("explains both surfaces, because half the bot is the prefix one", async () => {
		renderPage();

		expect(await screen.findByText("Slash commands")).toBeInTheDocument();
		expect(screen.getByText("Prefix commands")).toBeInTheDocument();
	});

	/** The links come from the bot's own theme, so a fork sends people to its own places rather than to this one. */
	it("sends people somewhere real when they are stuck", async () => {
		renderPage();

		expect(await screen.findByRole("link", { name: /Support server/ })).toHaveAttribute(
			"href",
			"https://discord.gg/example",
		);
		expect(screen.getByRole("link", { name: /Source code/ })).toHaveAttribute(
			"href",
			"https://github.com/Kkkermit/Testify",
		);
	});

	it("has no accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { level: 1 });

		await expectNoViolations(container);
	});
});
