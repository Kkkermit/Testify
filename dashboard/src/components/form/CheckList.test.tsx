import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckList, type CheckItem } from "@/components/form/CheckList";
import { RoleSwatch } from "@/components/form/RoleSwatch";
import { Toggle } from "@/components/form/Toggle";

const ITEMS: CheckItem[] = [
	{ id: "1", label: "One" },
	{ id: "2", label: "Two" },
	{ id: "3", label: "Three", blocked: true, blockedNote: "above Testify" },
];

function renderList(value: string[], max = 2) {
	const onChange = jest.fn();
	render(<CheckList label="Things" items={ITEMS} value={value} max={max} onChange={onChange} />);
	return onChange;
}

describe("CheckList", () => {
	/** At the limit the remaining boxes have to be unusable, or the API refuses a click that looked fine. */
	it("disables what is not chosen once the limit is reached", () => {
		renderList(["1", "2"]);

		expect(screen.getByRole("checkbox", { name: "Two" })).toBeEnabled();
		expect(screen.getByRole("checkbox", { name: /Three/ })).toBeDisabled();
	});

	it("still lets a chosen item be unchosen at the limit, or the list can never be emptied", () => {
		renderList(["1", "2"]);
		expect(screen.getByRole("checkbox", { name: "One" })).toBeEnabled();
	});
});

describe("Toggle", () => {
	/** The track is decoration; the thing that has to stay real is the control underneath it. */
	it("is a switch a keyboard can reach and operate", async () => {
		const onChange = jest.fn();
		render(<Toggle label="Members earn XP" checked={false} onChange={onChange} />);

		const toggle = screen.getByRole("switch", { name: "Members earn XP" });
		await userEvent.tab();
		expect(toggle).toHaveFocus();

		await userEvent.keyboard(" ");
		expect(onChange).toHaveBeenCalledWith(true);
	});
});

describe("RoleSwatch", () => {
	/** A role set to `#1a1a1a` would be invisible as text, so the colour goes on a bordered dot. */
	it("puts the colour on a swatch, never on the name", () => {
		render(<RoleSwatch name="Booster" colour="#1a1a1a" />);

		const name = screen.getByText("Booster");
		expect(name).not.toHaveStyle({ color: "#1a1a1a" });

		const swatch = name.parentElement!.querySelector("[aria-hidden]");
		expect(swatch).toHaveStyle({ backgroundColor: "#1a1a1a" });
	});
});
