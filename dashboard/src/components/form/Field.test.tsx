import { render, screen } from "@testing-library/react";
import { Field } from "@/components/form/Field";

describe("Field", () => {
	/**
	 * The wrapping form labels implicitly, so nothing in the caller has to remember an id — and forgetting one
	 * is the way a control ends up named nothing.
	 */
	it("names a control it wraps", () => {
		render(
			<Field label="Prefix">
				<input />
			</Field>,
		);

		expect(screen.getByLabelText("Prefix")).toBeInTheDocument();
	});

	it("names a control that carries its own id", () => {
		render(
			<Field label="Prefix" htmlFor="prefix">
				<input id="prefix" />
			</Field>,
		);

		expect(screen.getByLabelText("Prefix")).toBeInTheDocument();
	});

	/** One wrapper, so the distance between a name and its box cannot differ from one card to the next. */
	it("spaces the name from the control the same way in both forms", () => {
		const { container: wrapping } = render(
			<Field label="A">
				<input />
			</Field>,
		);
		const { container: sibling } = render(
			<Field label="A" htmlFor="a">
				<input id="a" />
			</Field>,
		);

		expect(wrapping.firstElementChild?.className).toBe(sibling.firstElementChild?.className);
	});

	it("keeps a caller's own layout classes alongside its own", () => {
		const { container } = render(
			<Field label="Level" className="w-24">
				<input />
			</Field>,
		);

		expect(container.firstElementChild).toHaveClass("w-24", "flex", "flex-col");
	});
});
