import { render, screen } from "@testing-library/react";
import { Card, cardClass } from "@/components/primitives/Card";

describe("cardClass", () => {
	/** A card that sets its own `p-4` puts its content 8px left of every other card on the page. */
	it("gives every density the same inline padding", () => {
		for (const padding of ["compact", "default"] as const) {
			expect(cardClass(padding)).toMatch(/(^|\s)(p-6|px-6)(\s|$)/);
		}
	});

	it("varies only the vertical rhythm between densities", () => {
		expect(cardClass("compact")).toContain("py-4");
		expect(cardClass("default")).toContain("p-6");
	});

	it("leaves a `none` card to its children", () => {
		expect(cardClass("none")).toContain("p-0");
	});

	it("carries the surface into a card that cannot be a div", () => {
		expect(cardClass("compact")).toContain("bg-card");
		expect(cardClass("compact")).toContain("rounded-card");
	});
});

describe("Card", () => {
	it("defaults to the panel padding", () => {
		render(<Card data-testid="card">Body</Card>);
		expect(screen.getByTestId("card")).toHaveClass("p-6");
	});

	it("lets a caller add classes without losing the surface", () => {
		render(
			<Card data-testid="card" padding="compact" className="flex">
				Body
			</Card>,
		);

		const card = screen.getByTestId("card");
		expect(card).toHaveClass("flex");
		expect(card).toHaveClass("px-6");
	});
});
