import { render, screen } from "@testing-library/react";
import { Disclosure } from "@/components/primitives/Disclosure";

describe("Disclosure", () => {
	/** A group nobody asked to have hidden should not cost a click to read. */
	it("starts open", () => {
		render(<Disclosure label="Who gets in">Body</Disclosure>);
		expect(screen.getByRole("group")).toHaveAttribute("open");
	});

	/** A label competing with the page's own headings would put a grouping choice into the heading outline. */
	it("names the group without adding a heading", () => {
		render(<Disclosure label="Who gets in">Body</Disclosure>);

		expect(screen.queryByRole("heading")).toBeNull();
		expect(screen.getByText("Who gets in")).toBeInTheDocument();
	});
});
