import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";

const SEGMENTS = [
	{ value: "all", label: "All", hint: "Every line the bot writes" },
	{ value: "errors", label: "Errors" },
];

function renderControl(onChange = jest.fn()) {
	render(<SegmentedControl label="Minimum level" segments={SEGMENTS} value="all" onChange={onChange} />);
	return onChange;
}

describe("SegmentedControl", () => {
	it("names the set of choices and marks the current one", () => {
		renderControl();

		expect(screen.getByRole("group", { name: "Minimum level" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Errors" })).toHaveAttribute("aria-pressed", "false");
	});

	it("reports the value rather than an index", async () => {
		const user = userEvent.setup();
		const onChange = renderControl();

		await user.click(screen.getByRole("button", { name: "Errors" }));

		expect(onChange).toHaveBeenCalledWith("errors");
	});

	/**
	 * A hint is a description, never a name. A segment named by its tooltip would be unreachable to anyone who
	 * arrives without a pointer, so the label has to stand on its own.
	 */
	it("leaves a hinted segment named by its label", () => {
		renderControl();

		const hinted = screen.getByRole("button", { name: "All" });
		expect(hinted).not.toHaveAttribute("aria-labelledby");
		expect(hinted).not.toHaveAttribute("title");
	});
});
