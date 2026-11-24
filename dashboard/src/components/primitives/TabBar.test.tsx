import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gift, Settings2, Zap } from "lucide-react";
import { useState } from "react";
import { edgesOf, TabBar, TabContent, type TabDefinition } from "@/components/primitives/TabBar";

const LABEL = "Levelling settings";
const TABS: TabDefinition<"general" | "rewards" | "boosts">[] = [
	{ key: "general", label: "levelling.tabGeneral", icon: Settings2 },
	{ key: "rewards", label: "levelling.tabRewards", icon: Gift },
	{ key: "boosts", label: "levelling.tabBoosts", icon: Zap },
];

function Harness(): React.JSX.Element {
	const [active, setActive] = useState<"general" | "rewards" | "boosts">("general");

	return (
		<>
			<TabBar label={LABEL} tabs={TABS} active={active} onSelect={setActive} />
			<TabContent label={LABEL} active={active}>
				{active} panel
			</TabContent>
		</>
	);
}

describe("TabBar", () => {
	it("marks only the active tab as selected", () => {
		render(<Harness />);

		expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: /role rewards/i })).toHaveAttribute("aria-selected", "false");
	});

	/** A tab announced with no panel leaves a screen reader with nothing to move into. */
	it("points each tab at the panel it opens", () => {
		render(<Harness />);

		const tab = screen.getByRole("tab", { name: /general/i });
		const panel = screen.getByRole("tabpanel");

		expect(tab.getAttribute("aria-controls")).toBe(panel.id);
		expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
	});

	/** The panel borrows the tab's name, which is what lets the panel drop its own duplicate heading. */
	it("names the panel after its tab", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		expect(screen.getByRole("tabpanel", { name: /general/i })).toBeInTheDocument();

		await user.click(screen.getByRole("tab", { name: /role rewards/i }));

		expect(screen.getByRole("tabpanel", { name: /role rewards/i })).toBeInTheDocument();
	});

	/** One stop for the whole set, or Tab walks through eight buttons before reaching the panel. */
	it("keeps a single tab stop across the set", () => {
		render(<Harness />);

		expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("tabindex", "0");
		expect(screen.getByRole("tab", { name: /role rewards/i })).toHaveAttribute("tabindex", "-1");
	});

	it("moves between tabs with the arrow keys, wrapping at each end", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		screen.getByRole("tab", { name: /general/i }).focus();

		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("tab", { name: /role rewards/i })).toHaveAttribute("aria-selected", "true");

		await user.keyboard("{ArrowLeft}{ArrowLeft}");
		expect(screen.getByRole("tab", { name: /xp boosts/i })).toHaveAttribute("aria-selected", "true");
	});

	it("jumps to the ends with Home and End", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		screen.getByRole("tab", { name: /general/i }).focus();

		await user.keyboard("{End}");
		expect(screen.getByRole("tab", { name: /xp boosts/i })).toHaveAttribute("aria-selected", "true");

		await user.keyboard("{Home}");
		expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("aria-selected", "true");
	});

	it("carries focus with the selection, so the arrow keys keep working", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		screen.getByRole("tab", { name: /general/i }).focus();
		await user.keyboard("{ArrowRight}");

		expect(screen.getByRole("tab", { name: /role rewards/i })).toHaveFocus();
	});
});

/** A tab strip wider than the screen has to show there is more, and keep the current tab in view. */
describe("a tab strip wider than its screen", () => {
	/**
	 * A strip that fits must fade neither end, or every desktop tab bar wears a gradient for nothing, and a fractional
	 * scrollLeft, which a trackpad leaves behind, must not read as "more to the right".
	 */
	it("knows which ends still have tabs past them", () => {
		const cases = [
			{ name: "at the start", scrollLeft: 0, clientWidth: 320, edges: { start: false, end: true } },
			{ name: "in the middle", scrollLeft: 300, clientWidth: 320, edges: { start: true, end: true } },
			{ name: "at the end", scrollLeft: 580, clientWidth: 320, edges: { start: true, end: false } },
			{ name: "fitting", scrollLeft: 0, clientWidth: 900, edges: { start: false, end: false } },
			{ name: "a subpixel from the end", scrollLeft: 579.6, clientWidth: 320.4, edges: { start: true, end: false } },
		];
		const wrong = cases.filter(({ scrollLeft, clientWidth, edges }) => {
			const found = edgesOf({ scrollLeft, clientWidth, scrollWidth: 900 });
			return found.start !== edges.start || found.end !== edges.end;
		});

		expect(wrong.map(({ name }) => name)).toEqual([]);
	});

	it("brings the active tab into view rather than leaving it off the edge", () => {
		const scrolled = jest.spyOn(Element.prototype, "scrollIntoView");

		render(<TabBar label="Owner" tabs={TABS} active="boosts" onSelect={() => undefined} />);

		expect(scrolled).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
		scrolled.mockRestore();
	});
});
