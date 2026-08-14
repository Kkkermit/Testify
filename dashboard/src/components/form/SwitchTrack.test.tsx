import { render, screen } from "@testing-library/react";
import { SwitchTrack, Toggle } from "@/components/form";

function knobOf(container: HTMLElement): Element {
	const knob = container.querySelector("[aria-hidden='true'] > span");
	if (knob === null) throw new Error("The track rendered no knob.");

	return knob;
}

/**
 * The knob used to be `bg-foreground`, which is white on near-black and near-black on paper — so in the light
 * theme it read as a hole punched in the filled track rather than as a handle sitting on it. Each half is a
 * colour measured against what it actually sits on.
 */
describe("SwitchTrack", () => {
	it("wears white on the filled track when it is on", () => {
		const { container } = render(<SwitchTrack on={true} />);

		expect(knobOf(container)).toHaveClass("bg-primary-foreground", "translate-x-4");
	});

	it("wears the field border colour on the card when it is off", () => {
		const { container } = render(<SwitchTrack on={false} />);

		expect(knobOf(container)).toHaveClass("bg-input", "translate-x-0");
	});

	it("never takes a colour that inverts with the theme", () => {
		for (const on of [true, false]) {
			const { container } = render(<SwitchTrack on={on} />);

			expect(knobOf(container)).not.toHaveClass("bg-foreground");
		}
	});

	/** The track colour is a `peer-checked:` rule, so it has to stay a sibling of the input that drives it. */
	it("follows its input as a sibling when a Toggle renders it", () => {
		const { container } = render(<Toggle label="Members earn XP" checked={true} onChange={() => undefined} />);

		const input = screen.getByRole("switch");
		expect(input.nextElementSibling).toHaveClass("peer-checked:bg-primary");
		expect(knobOf(container)).toHaveClass("bg-primary-foreground");
	});
});
