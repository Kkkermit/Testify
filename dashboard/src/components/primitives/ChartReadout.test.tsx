import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChartReadout, nextCell } from "@/components/primitives/ChartReadout";
import { expectNoViolations } from "@/test/axe";

// jsdom has no PointerEvent, so a mouse event stands in with the pointer type a browser would give it.
function pointer(target: Element, type: string, pointerType: "mouse" | "touch", at = { x: 0, y: 0 }): void {
	const event = new MouseEvent(type, { bubbles: type !== "pointerleave", clientX: at.x, clientY: at.y });
	Object.defineProperty(event, "pointerType", { value: pointerType });
	act(() => {
		target.dispatchEvent(event);
	});
}

function Chart({ values = [3, 5, 8, 13] }: { values?: number[] }): React.JSX.Element {
	return (
		<>
			<ChartReadout label="Runs a day" columns={2}>
				{values.map((value, index) => (
					<span
						key={index}
						data-testid={`cell-${String(index)}`}
						data-readout={`Day ${String(index + 1)}: ${String(value)}`}
					/>
				))}
			</ChartReadout>
			<button type="button">Elsewhere</button>
		</>
	);
}

const box = (): HTMLElement | null => document.querySelector<HTMLElement>('.tippy-box[data-theme~="testify"]');
const said = (): string | null | undefined => box()?.textContent;
const cell = (index: number): HTMLElement => screen.getByTestId(`cell-${String(index)}`);

describe("ChartReadout", () => {
	/** A native title is unstyled, waits a second and a half, and never opens on a phone. */
	it("reads a hovered cell out in the dashboard's own tooltip", async () => {
		render(<Chart />);

		pointer(cell(1), "pointermove", "mouse");

		await waitFor(() => {
			expect(said()).toBe("Day 2: 5");
		});
		expect(cell(1)).toHaveAttribute("data-active");
	});

	it("follows the pointer from cell to cell once it is open", async () => {
		render(<Chart />);

		pointer(cell(0), "pointermove", "mouse");
		await waitFor(() => {
			expect(said()).toBe("Day 1: 3");
		});

		pointer(cell(3), "pointermove", "mouse");

		expect(said()).toBe("Day 4: 13");
		expect(cell(0)).not.toHaveAttribute("data-active");
		expect(cell(3)).toHaveAttribute("data-active");
	});

	it("closes once the pointer leaves the chart", async () => {
		render(<Chart />);

		pointer(cell(0), "pointermove", "mouse");
		await waitFor(() => {
			expect(said()).toBe("Day 1: 3");
		});

		pointer(screen.getByRole("group", { name: "Runs a day" }), "pointerleave", "mouse");

		await waitFor(() => {
			expect(cell(0)).not.toHaveAttribute("data-active");
		});
	});

	/** On a phone the figures were unreachable: a tap has to open the readout, and a tap elsewhere close it. */
	it("opens on a tap and closes on a tap elsewhere", () => {
		render(<Chart />);

		pointer(cell(2), "pointerdown", "touch");
		pointer(cell(2), "pointerup", "touch");

		expect(said()).toBe("Day 3: 8");

		pointer(screen.getByRole("button", { name: "Elsewhere" }), "pointerdown", "touch");

		expect(cell(2)).not.toHaveAttribute("data-active");
	});

	/** A finger that starts on the chart and scrolls the page away is not asking for a figure. */
	it("stays shut for a touch the browser turned into a scroll", () => {
		render(<Chart />);

		pointer(cell(2), "pointerdown", "touch");
		pointer(cell(2), "pointercancel", "touch");

		expect(cell(2)).not.toHaveAttribute("data-active");
		expect(box()).toBeNull();
	});

	it("follows a finger sliding along the chart", () => {
		render(<Chart />);

		pointer(cell(0), "pointerdown", "touch", { x: 0, y: 0 });
		pointer(cell(1), "pointermove", "touch", { x: 30, y: 0 });

		expect(said()).toBe("Day 2: 5");
	});

	/** Hover alone left the figures to a mouse; the keyboard moves through the cells, and a grid moves by rows too. */
	it("moves through the cells with the arrow keys", async () => {
		render(<Chart />);

		await userEvent.tab();
		expect(said()).toBe("Day 1: 3");

		await userEvent.keyboard("{ArrowRight}");
		expect(said()).toBe("Day 2: 5");

		await userEvent.keyboard("{ArrowDown}");
		expect(said()).toBe("Day 4: 13");

		await userEvent.keyboard("{Home}");
		expect(said()).toBe("Day 3: 8");
	});

	/** Escape closes the readout without moving focus (WCAG 2.2, 1.4.13). */
	it("closes on Escape and keeps focus on the chart", async () => {
		render(<Chart />);

		await userEvent.tab();
		expect(said()).toBe("Day 1: 3");

		await userEvent.keyboard("{Escape}");

		expect(cell(0)).not.toHaveAttribute("data-active");
		expect(screen.getByRole("group", { name: "Runs a day" })).toHaveFocus();
	});

	it("reads out new figures under a cell that is already picked", async () => {
		const { rerender } = render(<Chart />);

		await userEvent.tab();
		expect(said()).toBe("Day 1: 3");

		rerender(<Chart values={[21, 5, 8, 13]} />);

		expect(said()).toBe("Day 1: 21");
	});

	/** The figures stay in the table for a screen reader, so the bars are hidden and only the chart's name is read. */
	it("is named by its label with the cells hidden from assistive technology", async () => {
		const { container } = render(<Chart />);

		const group = screen.getByRole("group", { name: "Runs a day" });
		expect(group).not.toHaveAttribute("aria-hidden");
		expect(cell(0).closest("[aria-hidden]")).not.toBeNull();
		await expectNoViolations(container);
	});
});

describe("nextCell", () => {
	it("moves along a row, between rows of a grid, and stops at the edges", () => {
		const grid = { count: 6, columns: 3 };

		expect(nextCell({ ...grid, at: 0, key: "ArrowLeft" })).toBe(0);
		expect(nextCell({ ...grid, at: 5, key: "ArrowRight" })).toBe(5);
		expect(nextCell({ ...grid, at: 1, key: "ArrowDown" })).toBe(4);
		expect(nextCell({ ...grid, at: 4, key: "ArrowDown" })).toBe(4);
		expect(nextCell({ ...grid, at: 4, key: "ArrowUp" })).toBe(1);
		expect(nextCell({ ...grid, at: 4, key: "Home" })).toBe(3);
		expect(nextCell({ ...grid, at: 4, key: "End" })).toBe(5);
		expect(nextCell({ count: 6, columns: undefined, at: 2, key: "ArrowDown" })).toBeNull();
		expect(nextCell({ count: 6, columns: undefined, at: 2, key: "End" })).toBe(5);
		expect(nextCell({ ...grid, at: 2, key: "Enter" })).toBeNull();
	});
});
