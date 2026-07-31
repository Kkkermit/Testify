import { render, screen } from "@testing-library/react";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Reveal, revealDelay } from "@/components/motion/Reveal";

describe("revealDelay", () => {
	it("starts the first item immediately", () => {
		expect(revealDelay(0)).toBe(0);
	});

	it("staggers each item after it", () => {
		expect(revealDelay(2, 40)).toBe(80);
	});

	/** A list of forty servers must not take two seconds to finish arriving. */
	it("caps the stagger so a long list does not read as a slow page", () => {
		expect(revealDelay(400)).toBe(revealDelay(40));
		expect(revealDelay(400)).toBeLessThanOrEqual(240);
	});

	it("treats a negative index as the first item", () => {
		expect(revealDelay(-3)).toBe(0);
	});
});

describe("Reveal", () => {
	it("renders the element it was asked for, carrying its children", () => {
		render(
			<ul>
				<Reveal as="li" index={1}>
					A server
				</Reveal>
			</ul>,
		);

		expect(screen.getByRole("listitem")).toHaveTextContent("A server");
	});

	it("puts the stagger on the element as a delay", () => {
		render(<Reveal index={2}>Third</Reveal>);
		expect(screen.getByText("Third")).toHaveStyle({ animationDelay: "80ms" });
	});
});

describe("AnimatedNumber", () => {
	it("formats with separators once it has settled", async () => {
		render(<AnimatedNumber value={12345} />);
		expect(await screen.findByText("12,345")).toBeInTheDocument();
	});
});
