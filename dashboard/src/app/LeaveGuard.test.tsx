import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Link, RouterProvider, useLocation } from "react-router";
import { LeaveGuard } from "@/app/LeaveGuard";
import { expectNoViolations } from "@/test/axe";
import "@/i18n";

function Draft({ dirty }: { dirty: boolean }): React.JSX.Element {
	const location = useLocation();
	return (
		<>
			<LeaveGuard when={dirty} />
			<p data-testid="where">{`${location.pathname}${location.search}`}</p>
			<Link to="/elsewhere">Somewhere else</Link>
			<Link to="/draft?tab=two">Another tab</Link>
		</>
	);
}

function renderAt(dirty: boolean) {
	const router = createMemoryRouter(
		[
			{ path: "/draft", element: <Draft dirty={dirty} /> },
			{ path: "/elsewhere", element: <p data-testid="where">/elsewhere</p> },
		],
		{ initialEntries: ["/draft"] },
	);
	return render(<RouterProvider router={router} />);
}

function unloading(): Event {
	const event = new Event("beforeunload", { cancelable: true });
	window.dispatchEvent(event);
	return event;
}

describe("LeaveGuard", () => {
	it("lets a screen with nothing unsaved go without asking", async () => {
		const user = userEvent.setup();
		renderAt(false);

		await user.click(screen.getByRole("link", { name: "Somewhere else" }));

		expect(screen.getByTestId("where")).toHaveTextContent("/elsewhere");
		expect(unloading().defaultPrevented).toBe(false);
	});

	/** A draft held until Save is lost to one stray click in the sidebar unless something asks first. */
	it("asks before leaving an unsaved draft, with the safe choice focused", async () => {
		const user = userEvent.setup();
		renderAt(true);

		await user.click(screen.getByRole("link", { name: "Somewhere else" }));

		expect(screen.getByRole("alertdialog", { name: "Leave without saving?" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
		expect(screen.getByTestId("where")).toHaveTextContent("/draft");
	});

	it("stays on Keep editing or Escape, and hands focus back", async () => {
		const user = userEvent.setup();
		renderAt(true);
		const link = screen.getByRole("link", { name: "Somewhere else" });

		await user.click(link);
		await user.click(screen.getByRole("button", { name: "Keep editing" }));
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(link).toHaveFocus();

		await user.click(link);
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(screen.getByTestId("where")).toHaveTextContent("/draft");
	});

	it("goes on Leave without saving", async () => {
		const user = userEvent.setup();
		renderAt(true);

		await user.click(screen.getByRole("link", { name: "Somewhere else" }));
		await user.click(screen.getByRole("button", { name: "Leave without saving" }));

		expect(screen.getByTestId("where")).toHaveTextContent("/elsewhere");
	});

	it("keeps Tab between its two buttons", async () => {
		const user = userEvent.setup();
		renderAt(true);

		await user.click(screen.getByRole("link", { name: "Somewhere else" }));
		await user.tab();
		expect(screen.getByRole("button", { name: "Leave without saving" })).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
	});

	it("does not count a tab on the same screen as leaving it", async () => {
		const user = userEvent.setup();
		renderAt(true);

		await user.click(screen.getByRole("link", { name: "Another tab" }));

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(screen.getByTestId("where")).toHaveTextContent("/draft?tab=two");
	});

	it("has the browser ask before a reload or a closed tab", () => {
		renderAt(true);

		expect(unloading().defaultPrevented).toBe(true);
	});

	it("passes axe while asking", async () => {
		const user = userEvent.setup();
		const { container } = renderAt(true);

		await user.click(screen.getByRole("link", { name: "Somewhere else" }));

		await expectNoViolations(container);
	});
});
