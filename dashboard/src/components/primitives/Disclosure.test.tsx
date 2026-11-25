import { render, screen } from "@testing-library/react";
import { Disclosure } from "@/components/primitives/Disclosure";

describe("Disclosure", () => {
	/**
	 * A group nobody asked to have hidden should not cost a click to read, and a label competing with the page's own
	 * headings would put a grouping choice into the heading outline.
	 */
	it("starts open, and names the group without adding a heading", () => {
		render(<Disclosure label="Who gets in">Body</Disclosure>);

		expect(screen.getByRole("group")).toHaveAttribute("open");
		expect(screen.queryByRole("heading")).toBeNull();
		expect(screen.getByText("Who gets in")).toBeInTheDocument();
	});
});
