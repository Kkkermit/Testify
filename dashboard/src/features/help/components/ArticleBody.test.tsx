import { screen } from "@testing-library/react";
import { ArticleBody } from "@/features/help/components/ArticleBody";
import { renderWithProviders } from "@/test/renderWithProviders";

function renderBody(body: string) {
	return renderWithProviders(<ArticleBody body={body} />, { path: "/help", route: "/help" });
}

describe("ArticleBody", () => {
	/** Text is drawn as text: an article containing markup shows the characters rather than running them. */
	it("never parses anything in the body as HTML", () => {
		const { container } = renderBody('<img src=x onerror="alert(1)"> and [prize](https://evil.example/)');

		expect(container.querySelector("img")).toBeNull();
		expect(screen.queryByRole("link")).toBeNull();
		expect(container.textContent).toContain("<img src=x");
	});
});
