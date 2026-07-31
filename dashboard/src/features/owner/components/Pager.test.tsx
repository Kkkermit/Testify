import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pager } from "@/features/owner/components/Pager";

describe("Pager", () => {
	it("renders nothing when everything fits on one page", () => {
		expect(render(<Pager page={1} pages={1} onChange={jest.fn()} />).container).toBeEmptyDOMElement();
	});

	it("steps forwards and backwards", async () => {
		const onChange = jest.fn();
		render(<Pager page={2} pages={3} onChange={onChange} />);

		await userEvent.click(screen.getByRole("button", { name: "Next" }));
		expect(onChange).toHaveBeenCalledWith(3);

		await userEvent.click(screen.getByRole("button", { name: "Previous" }));
		expect(onChange).toHaveBeenLastCalledWith(1);
	});

	/** A disabled end is what stops a click producing page 0, which the API answers with a 400. */
	it("disables the end it is already at", () => {
		const { rerender } = render(<Pager page={1} pages={3} onChange={jest.fn()} />);
		expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

		rerender(<Pager page={3} pages={3} onChange={jest.fn()} />);
		expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
	});

	it("says where you are, politely enough for a screen reader to follow", () => {
		render(<Pager page={2} pages={5} onChange={jest.fn()} />);

		const status = screen.getByText("Page 2 of 5");
		expect(status).toHaveAttribute("aria-live", "polite");
	});
});
