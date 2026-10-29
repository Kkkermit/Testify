import { screen } from "@testing-library/react";
import { DOC_PAGES } from "@/features/docs/docs.pages";
import { DocsPage } from "@/features/docs/DocsPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

function open(route: string): ReturnType<typeof renderWithProviders> {
	const path = route.startsWith("/docs/guides/")
		? "/docs/guides/:articleId"
		: route === "/docs"
			? "/docs"
			: "/docs/:slug";
	return renderWithProviders(<DocsPage />, { path, route });
}

describe("the docs", () => {
	it("lists every page on the index, each linking to its own address", async () => {
		open("/docs");

		const main = await screen.findByRole("heading", { level: 1, name: "Docs" });
		const links = (main.closest("div")?.parentElement ?? document.body).querySelectorAll("a[href^='/docs/']");
		expect(new Set([...links].map((link) => link.getAttribute("href")))).toEqual(
			new Set(DOC_PAGES.map((page) => `/docs/${page.slug}`)),
		);
	});

	/** The page is the README's own words, so it cannot describe a bot that is no longer there. */
	it("shows a page read from the repository, with where it was read from", async () => {
		open("/docs/requirements");

		expect(await screen.findByRole("heading", { level: 1, name: "Requirements" })).toBeInTheDocument();
		expect(await screen.findByRole("heading", { level: 3, name: /operating systems/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "README.md" })).toHaveAttribute("href", "/source-code/README.md");
	});

	it("lists every environment variable, and marks the ones the bot needs", async () => {
		open("/docs/configuration");

		const token = await screen.findByText("DISCORD_TOKEN");
		expect(token.parentElement).toHaveTextContent(/required/i);
		expect(screen.getByText("SITE_GITHUB_TOKEN").parentElement).not.toHaveTextContent(/required/i);
	});

	it("shows the help articles signed out, and opens one", async () => {
		open("/docs/guides/levelling");

		expect(await screen.findByRole("heading", { name: "Article levelling" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /all guides/i })).toHaveAttribute("href", "/docs/guides");
	});

	it("says so for a page that does not exist", async () => {
		open("/docs/nothing-here");

		expect(await screen.findByText(/there is no such page/i)).toBeInTheDocument();
	});

	it("passes axe", async () => {
		const { container } = open("/docs/docker");

		await screen.findByRole("heading", { level: 1, name: "Docker" });
		await screen.findAllByRole("heading", { level: 2 });
		await expectNoViolations(container);
	});
});
