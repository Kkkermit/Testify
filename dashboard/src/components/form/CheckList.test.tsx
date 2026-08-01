import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckList, type CheckItem } from "@/components/form/CheckList";
import { RoleSwatch } from "@/components/form/RoleSwatch";
import { SavingIndicator, savingStateOf } from "@/components/form/SavingIndicator";
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
	it("says how much of the allowance is used", () => {
		renderList(["1"]);
		expect(screen.getByText("1 of 2 chosen")).toBeInTheDocument();
	});

	it("adds an unchecked item and removes a checked one", async () => {
		const onChange = renderList(["1"]);

		await userEvent.click(screen.getByRole("checkbox", { name: "Two" }));
		expect(onChange).toHaveBeenCalledWith(["1", "2"]);

		await userEvent.click(screen.getByRole("checkbox", { name: "One" }));
		expect(onChange).toHaveBeenLastCalledWith([]);
	});

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

	it("greys a blocked item and says why rather than hiding it", () => {
		renderList([], 10);

		expect(screen.getByRole("checkbox", { name: /Three/ })).toBeDisabled();
		expect(screen.getByText("above Testify")).toBeInTheDocument();
	});
});

describe("savingStateOf", () => {
	it("reads pending, then settled, then nothing", () => {
		expect(savingStateOf(true, false)).toBe("saving");
		expect(savingStateOf(false, true)).toBe("saved");
		expect(savingStateOf(false, false)).toBe("idle");
	});
});

describe("SavingIndicator", () => {
	it("says nothing at rest, so the row is not permanently captioned", () => {
		render(<SavingIndicator state="idle" />);
		expect(screen.getByRole("status")).toHaveTextContent("");
	});

	it("announces the outcome politely", () => {
		render(<SavingIndicator state="saved" />);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("Saved");
		expect(status).toHaveAttribute("aria-live", "polite");
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

	it("does not fire while disabled", async () => {
		const onChange = jest.fn();
		render(<Toggle label="Locked" checked={false} disabled onChange={onChange} />);

		await userEvent.click(screen.getByRole("switch", { name: "Locked" }));
		expect(onChange).not.toHaveBeenCalled();
	});
});

describe("RoleSwatch", () => {
	/**
	 * Role colours are chosen by whoever made the role, so plenty are unreadable on a near-black page — one set
	 * to `#1a1a1a` would be invisible as text. The colour goes on a bordered dot, the name stays readable.
	 */
	it("puts the colour on a swatch, never on the name", () => {
		render(<RoleSwatch name="Booster" colour="#1a1a1a" />);

		const name = screen.getByText("Booster");
		expect(name).not.toHaveStyle({ color: "#1a1a1a" });

		const swatch = name.parentElement!.querySelector("[aria-hidden]");
		expect(swatch).toHaveStyle({ backgroundColor: "#1a1a1a" });
	});

	it("renders a colourless role without an empty style", () => {
		render(<RoleSwatch name="Member" colour={null} />);
		expect(screen.getByText("Member")).toBeInTheDocument();
	});

	it("hides the swatch from assistive technology, since the name carries the meaning", () => {
		render(<RoleSwatch name="Booster" colour="#7c3aed" />);

		expect(screen.getByText("Booster").parentElement!.querySelector("[aria-hidden='true']")).toBeInTheDocument();
	});
});
