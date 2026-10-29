import { screen } from "@testing-library/react";
import { Markdown, prepareDoc } from "@/features/docs/components/Markdown";
import { PAGES_BY_FILE, PAGES_BY_SECTION } from "@/features/docs/docs.pages";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

const context = {
	repository: "https://github.com/Kkkermit/Testify",
	pagesByFile: PAGES_BY_FILE,
	pagesBySection: PAGES_BY_SECTION,
};

function show(markdown: string, file = "README.md"): HTMLElement {
	return renderWithProviders(<Markdown doc={prepareDoc([{ file, markdown }])} context={context} />).container;
}

describe("Markdown", () => {
	/** The first Markdown this app turns into a page, so nothing in a file may become markup in it. */
	it("draws no HTML a file holds, only its text", async () => {
		const page = show(
			'Hello <script>alert(1)</script> <img src=x onerror="alert(2)">\n\n<div onclick="x()">block</div>\n\nsafe &amp; sound',
		);

		await screen.findByText(/safe & sound/);
		expect(page.querySelector("script, img, [onclick], [onerror]")).toBeNull();
	});

	it("links a file the docs show to its page, any other to the source browser, and the web to the web", async () => {
		show("[hosting](docs/hosting.md) [loader](src/core/loader.ts) [web](https://discord.com)");

		expect((await screen.findByRole("link", { name: "hosting" })).getAttribute("href")).toBe("/docs/docker");
		expect(screen.getByRole("link", { name: "loader" }).getAttribute("href")).toBe("/source-code/src/core/loader.ts");
		expect(screen.getByRole("link", { name: "web" }).getAttribute("href")).toBe("https://discord.com");
	});

	/** The policy lets no outside picture in, so a badge is its description rather than a broken image. */
	it("shows a picture as its description", async () => {
		const page = show("![commands: 86](https://img.shields.io/badge/x) ![Rank card](docs/images/bot/rank-card.png)");

		expect(await screen.findByText("commands: 86")).toBeInTheDocument();
		expect(page.querySelector("img")).toBeNull();
		expect(screen.getByRole("link", { name: /rank card/i }).getAttribute("href")).toBe(
			"https://github.com/Kkkermit/Testify/blob/HEAD/docs/images/bot/rank-card.png",
		);
	});

	it("gives headings GitHub's anchors and an alert its label", async () => {
		show("## 💻 Compatibility\n\n> [!WARNING]\n> Do not remove `cross-env`.");

		expect((await screen.findByRole("heading", { name: /compatibility/i })).id).toBe("-compatibility");
		expect(screen.getByText("Warning")).toBeInTheDocument();
		expect(screen.queryByText(/\[!WARNING\]/)).toBeNull();
	});

	it("passes axe with a table, a list, code and a task list", async () => {
		const page = show(
			"## Heading\n\n| Name | What |\n| --- | :-: |\n| `a` | b |\n\n1. one\n2. two\n\n- [x] done\n- [ ] not yet\n\n```ts\nconst a = 1;\n```\n",
		);

		await screen.findByRole("table");
		await expectNoViolations(page);
	});
});
