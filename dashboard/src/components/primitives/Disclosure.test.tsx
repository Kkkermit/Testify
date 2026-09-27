import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Disclosure } from "@/components/primitives/Disclosure";

describe("Disclosure", () => {
	/** A group nobody asked to have hidden should not cost a click to read. */
	it("starts open", () => {
		render(<Disclosure label="Who gets in">Body</Disclosure>);
		expect(screen.getByRole("group")).toHaveAttribute("open");
	});

	it("folds and unfolds from the summary", async () => {
		const user = userEvent.setup();
		render(<Disclosure label="Who gets in">Body</Disclosure>);

		await user.click(screen.getByText("Who gets in"));
		expect(screen.getByRole("group")).not.toHaveAttribute("open");

		await user.click(screen.getByText("Who gets in"));
		expect(screen.getByRole("group")).toHaveAttribute("open");
	});

	/** A label competing with the page's own headings would put a grouping choice into the heading outline. */
	it("names the group without adding a heading", () => {
		render(<Disclosure label="Who gets in">Body</Disclosure>);

		expect(screen.queryByRole("heading")).toBeNull();
		expect(screen.getByText("Who gets in")).toBeInTheDocument();
	});

	it("can be asked to start folded", () => {
		render(
			<Disclosure label="Who gets in" defaultOpen={false}>
				Body
			</Disclosure>,
		);

		expect(screen.getByRole("group")).not.toHaveAttribute("open");
	});
});
