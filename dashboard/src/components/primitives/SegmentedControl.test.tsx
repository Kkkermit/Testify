import { render, screen } from "@testing-library/react";
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
	/** A hint describes, never names: a segment named by its tooltip is unreachable without a pointer. */
	it("leaves a hinted segment named by its label", () => {
		renderControl();

		const hinted = screen.getByRole("button", { name: "All" });
		expect(hinted).not.toHaveAttribute("aria-labelledby");
		expect(hinted).not.toHaveAttribute("title");
	});
});
