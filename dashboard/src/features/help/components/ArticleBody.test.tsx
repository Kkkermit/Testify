import { screen } from "@testing-library/react";
import { ArticleBody } from "@/features/help/components/ArticleBody";
import { renderWithProviders } from "@/test/renderWithProviders";

function renderBody(body: string) {
	return renderWithProviders(<ArticleBody body={body} />, { path: "/help", route: "/help" });
}

describe("ArticleBody", () => {
	it("draws lists as lists, in order", () => {
		renderBody("1. First\n2. Second\n\n- A\n- B");

		const [ordered, unordered] = screen.getAllByRole("list");
		expect(ordered?.tagName).toBe("OL");
		expect(unordered?.tagName).toBe("UL");
		expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["First", "Second", "A", "B"]);
	});

	it("opens an outside link in a new tab without handing it this page", () => {
		renderBody("See [the source](https://github.com/Kkkermit/Testify).");

		const link = screen.getByRole("link", { name: "the source" });
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noreferrer");
	});

	/** Text is drawn as text: an article containing markup shows the characters rather than running them. */
	it("never parses anything in the body as HTML", () => {
		const { container } = renderBody('<img src=x onerror="alert(1)"> and [prize](https://evil.example/)');

		expect(container.querySelector("img")).toBeNull();
		expect(screen.queryByRole("link")).toBeNull();
		expect(container.textContent).toContain("<img src=x");
	});
});
