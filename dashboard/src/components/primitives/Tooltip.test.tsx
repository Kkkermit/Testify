import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "@/components/primitives/Tooltip";

describe("Tooltip", () => {
	it("says nothing until it is asked", () => {
		render(
			<Tooltip label="Every server you can configure">
				<button type="button">Servers</button>
			</Tooltip>,
		);

		expect(screen.queryByText("Every server you can configure")).toBeNull();
	});

	/** A tooltip only a mouse can reach is a tooltip most people never see. */
	it("opens on keyboard focus, not only on hover", async () => {
		render(
			<Tooltip label="Every server you can configure">
				<button type="button">Servers</button>
			</Tooltip>,
		);

		await userEvent.tab();

		expect(screen.getByRole("button", { name: "Servers" })).toHaveFocus();
		await waitFor(() => {
			expect(screen.getByText("Every server you can configure")).toBeInTheDocument();
		});
	});

	it("opens on hover", async () => {
		render(
			<Tooltip label="Sign out of the dashboard">
				<button type="button">Sign out</button>
			</Tooltip>,
		);

		await userEvent.hover(screen.getByRole("button"));

		await waitFor(() => {
			expect(screen.getByText("Sign out of the dashboard")).toBeInTheDocument();
		});
	});

	/**
	 * The contract the whole component rests on: it describes, it never names. A control whose only label is a
	 * tooltip is unreachable to anyone who arrives at it without a pointer.
	 */
	it("describes the control rather than naming it", async () => {
		render(
			<Tooltip label="Every server you can configure">
				<button type="button">Servers</button>
			</Tooltip>,
		);

		const trigger = screen.getByRole("button");
		expect(trigger).toHaveAccessibleName("Servers");

		await userEvent.tab();
		await waitFor(() => {
			expect(trigger).toHaveAttribute("aria-describedby");
		});
		// Still named by its own text, not by what the tooltip added.
		expect(trigger).toHaveAccessibleName("Servers");
	});

	/** Tippy hides its box rather than unmounting it, so the fact that matters is the description being dropped. */
	it("withdraws the description when focus leaves", async () => {
		render(
			<>
				<Tooltip label="A description">
					<button type="button">First</button>
				</Tooltip>
				<button type="button">Second</button>
			</>,
		);

		const first = screen.getByRole("button", { name: "First" });

		await userEvent.tab();
		await waitFor(() => {
			expect(first).toHaveAttribute("aria-describedby");
		});

		await userEvent.tab();
		await waitFor(() => {
			expect(first).not.toHaveAttribute("aria-describedby");
		});
	});
});
