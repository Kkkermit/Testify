import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SourcePage } from "@/features/source/SourcePage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function open(route: string): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<SourcePage />, { path: "/source-code/*", route });
}

describe("the source browser", () => {
	it("shows the repository's numbers and its files at the top", async () => {
		open("/source-code");

		expect(await screen.findByText("Kkkermit/Testify")).toBeInTheDocument();
		expect(screen.getByText(/showing release\/v2.0.9/i)).toBeInTheDocument();
		expect((await screen.findAllByRole("link", { name: "src" })).length).toBeGreaterThan(0);
	});

	/** Traffic needs a token the host chooses to give, and the page says how rather than showing zeros. */
	it("says how to show traffic when there is no token", async () => {
		open("/source-code");

		expect(await screen.findByText(/traffic needs a github token/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /how to add a token/i })).toHaveAttribute("href", "/docs/configuration");
	});

	/** A chart is for the eye, so the numbers behind every bar are a table a screen reader can read. */
	it("charts views and clones a day with the figures in a table, and where visitors came from", async () => {
		server.use(
			http.get("/api/site/traffic", () =>
				HttpResponse.json({
					available: true,
					days: [
						{ date: "2026-10-27", views: 12, uniqueViews: 4, clones: 3, uniqueClones: 2 },
						{ date: "2026-10-28", views: 30, uniqueViews: 9, clones: 1, uniqueClones: 1 },
					],
					referrers: [{ name: "github.com", count: 25, uniques: 7 }],
					pages: [],
				}),
			),
		);
		open("/source-code");

		const views = await screen.findByRole("table", { name: "Views" });
		const day = within(views).getByRole("rowheader", { name: "28 Oct 2026" }).closest("tr");
		expect(
			within(day ?? views)
				.getAllByRole("cell")
				.map((cell) => cell.textContent),
		).toEqual(["30", "9"]);
		expect(screen.getByText("42 in total")).toBeInTheDocument();
		expect(screen.getByText("github.com")).toBeInTheDocument();
		expect(screen.getByText(/no pages were viewed/i)).toBeInTheDocument();
	});

	it("previews a Markdown file, and shows its source on request", async () => {
		const user = userEvent.setup();
		open("/source-code/README.md");

		// The page's own title is the h1, so the file's is drawn a level down.
		expect(await screen.findByRole("heading", { name: "Testify", level: 2 })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Code" }));

		const code = screen.getByRole("region", { name: /the code in README.md/i });
		expect(code).toHaveTextContent("# Testify");
		expect(screen.getByRole("button", { name: "Code" })).toHaveAttribute("aria-pressed", "true");
	});

	it("shows a file with its line numbers kept out of the code, and a link to it on GitHub", async () => {
		open("/source-code/src/core/loader.ts");

		const code = await screen.findByRole("region", { name: /the code in src\/core\/loader.ts/i });
		expect(code.querySelector(".code-tokens")?.textContent).toBe("export const answer = 42;\n// done\n");
		expect(screen.getByRole("link", { name: /view on github/i })).toHaveAttribute(
			"href",
			"https://github.com/Kkkermit/Testify/blob/release/v2.0.9/src/core/loader.ts",
		);
	});

	it("opens the tree to the file being shown, and finds a file by part of its path", async () => {
		const user = userEvent.setup();
		open("/source-code/src/core/loader.ts");

		expect(await screen.findByRole("button", { name: /close core/i })).toHaveAttribute("aria-expanded", "true");
		await user.type(screen.getByRole("searchbox", { name: /find a file/i }), "index");
		expect(screen.getByRole("link", { name: "src/index.ts" })).toHaveAttribute("href", "/source-code/src/index.ts");
	});

	it("sends a picture to GitHub rather than drawing it", async () => {
		open("/source-code/docs/banner.png");

		expect(await screen.findByText(/not a text file/i)).toBeInTheDocument();
	});

	/** A private repository's code is never shown, whatever token the host gave the bot. */
	it("says the code is private rather than failing", async () => {
		server.use(
			http.get("/api/site/tree", () =>
				HttpResponse.json({ error: { code: "private_repository", message: "x" } }, { status: 403 }),
			),
		);
		open("/source-code");

		expect(await screen.findByText(/the code is private/i)).toBeInTheDocument();
	});

	it("passes axe on a file", async () => {
		const { container } = open("/source-code/src/core/loader.ts");

		await screen.findByRole("region", { name: /the code in/i });
		await expectNoViolations(container);
	});
});
