import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gift, Settings2, Zap } from "lucide-react";
import { useState } from "react";
import { TabBar, TabContent, type TabDefinition } from "@/components/primitives/TabBar";

const LABEL = "Levelling settings";
const TABS: TabDefinition<"general" | "rewards" | "boosts">[] = [
	{ key: "general", label: "General", icon: Settings2 },
	{ key: "rewards", label: "Role rewards", icon: Gift },
	{ key: "boosts", label: "XP boosts", icon: Zap },
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
