import { screen } from "@testing-library/react";
import { useHashTarget } from "@/hooks/useHashTarget";
import { renderWithProviders } from "@/test/renderWithProviders";

function Page(): React.JSX.Element {
	useHashTarget();

	return (
		<main>
			<h1>Settings</h1>
			<section id="language" tabIndex={-1} aria-labelledby="language-heading">
				<h2 id="language-heading">Language</h2>
			</section>
		</main>
	);
}

function render(route: string) {
	return renderWithProviders(<Page />, { path: "/appearance", route });
}

describe("useHashTarget", () => {
	/** Scrolling alone leaves a screen reader at the top of the page, still reading the heading it arrived on. */
	it("puts focus on the section a fragment names", () => {
		render("/appearance#language");

		expect(screen.getByRole("region", { name: "Language" })).toHaveFocus();
	});

	it("scrolls it into view as well, for everybody reading with their eyes", () => {
		const scrolled = jest.spyOn(Element.prototype, "scrollIntoView");
		render("/appearance#language");

		expect(scrolled).toHaveBeenCalled();
	});

	it("leaves focus alone when the URL names nothing", () => {
		render("/appearance");

		expect(screen.getByRole("region", { name: "Language" })).not.toHaveFocus();
	});

	/** A stale link, or one naming a section that has since moved, must not throw on the way in. */
	it("does nothing when the fragment names no element on the page", () => {
		expect(() => render("/appearance#gone")).not.toThrow();
		expect(screen.getByRole("region", { name: "Language" })).not.toHaveFocus();
	});

	/** The animation is JavaScript-driven, so the stylesheet cannot flatten it — the hook has to ask. */
	it("does not animate the scroll for a reader who asked for less motion", () => {
		document.documentElement.setAttribute("data-motion", "reduced");
		const scrolled = jest.spyOn(Element.prototype, "scrollIntoView");

		render("/appearance#language");

		expect(scrolled).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
		document.documentElement.removeAttribute("data-motion");
	});
});
