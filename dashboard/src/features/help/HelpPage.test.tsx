import { screen } from "@testing-library/react";
import { allNavItems, navigationFor } from "@/config/navigation";
import { articlesByTopic, helpAreas } from "@/features/help/help.utils";
import { HelpPage } from "@/features/help/HelpPage";
import { expectNoViolations } from "@/test/axe";
import { supportIndex } from "@/test/fixtures/bot";
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
});

describe("articlesByTopic", () => {
	/** Every command already has a row on the command list, so browsing leaves them to it. */
	it("groups the written articles in reading order, alphabetised, and leaves command pages out", () => {
		expect(articlesByTopic(supportIndex.articles)).toEqual([
			{ topic: "getting-started", articles: [expect.objectContaining({ id: "add-the-bot" })] },
			{
				topic: "setup",
				articles: [expect.objectContaining({ id: "levelling" }), expect.objectContaining({ id: "tickets" })],
			},
			{ topic: "troubleshooting", articles: [expect.objectContaining({ id: "role-order" })] },
		]);
	});
});

describe("HelpPage", () => {
	/** A new admin looking for a command has to be able to get from here to the list of them. */
	it("points at the command list", async () => {
		renderPage();

		expect(await screen.findByRole("link", { name: "Every command, searchable" })).toHaveAttribute("href", "/commands");
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
