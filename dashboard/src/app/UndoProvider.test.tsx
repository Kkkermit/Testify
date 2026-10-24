import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUndo, UNDO_WINDOW_MS } from "@/app/undo";
import { UndoProvider } from "@/app/UndoProvider";
import { ApiError } from "@/lib/api";
import "@/i18n";

function Rows({ commit }: { commit: (id: string) => Promise<unknown> }): React.JSX.Element {
	const undo = useUndo();
	return (
		<ul>
			{["a", "b"]
				.filter((id) => !undo.isHidden(id))
				.map((id) => (
					<li key={id}>
						<button
							type="button"
							onClick={() => {
								undo.schedule({ key: id, label: `row ${id}`, commit: () => commit(id) });
							}}
						>
							Delete {id}
						</button>
					</li>
				))}
		</ul>
	);
}

function setup(commit: (id: string) => Promise<unknown> = () => Promise.resolve()) {
	const spy = jest.fn(commit);
	const user = userEvent.setup({ advanceTimers: (ms) => jest.advanceTimersByTime(ms) });
	const view = render(
		<UndoProvider>
			<Rows commit={spy} />
		</UndoProvider>,
	);
	return { spy, user, ...view };
}

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("undoable deletes", () => {
	it("hides the row at once and sends nothing until the window closes", async () => {
		const { spy, user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete a" }));

		expect(screen.queryByRole("button", { name: "Delete a" })).not.toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("Deleted row a.");
		act(() => {
			jest.advanceTimersByTime(UNDO_WINDOW_MS - 1);
		});
		expect(spy).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(1);
			await Promise.resolve();
		});
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith("a");
		expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Delete a" })).not.toBeInTheDocument();
	});

	it("puts the row back on Undo and never sends it", async () => {
		const { spy, user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete a" }));
		await user.click(screen.getByRole("button", { name: "Undo" }));
		act(() => {
			jest.advanceTimersByTime(UNDO_WINDOW_MS * 2);
		});

		expect(screen.getByRole("button", { name: "Delete a" })).toBeInTheDocument();
		expect(spy).not.toHaveBeenCalled();
	});

	/** WCAG 2.2.1: a reader still deciding has the clock held for them, and gets the rest of it back after. */
	it("holds the clock while the pointer is on the notice", async () => {
		const { spy, user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete a" }));
		act(() => {
			jest.advanceTimersByTime(UNDO_WINDOW_MS / 2);
		});
		const notice = screen.getByText("Deleted row a.").closest("div");
		if (notice === null) throw new Error("The notice has no box around its text.");
		fireEvent.mouseEnter(notice);
		act(() => {
			jest.advanceTimersByTime(UNDO_WINDOW_MS * 3);
		});
		expect(spy).not.toHaveBeenCalled();

		fireEvent.mouseLeave(notice);
		act(() => {
			jest.advanceTimersByTime(UNDO_WINDOW_MS / 2 - 1);
		});
		expect(spy).not.toHaveBeenCalled();
		await act(async () => {
			jest.advanceTimersByTime(1);
			await Promise.resolve();
		});
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("sends a waiting delete at once when another is made", async () => {
		const { spy, user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete a" }));
		await user.click(screen.getByRole("button", { name: "Delete b" }));

		expect(spy).toHaveBeenCalledWith("a");
		expect(spy).not.toHaveBeenCalledWith("b");
		expect(screen.getByRole("status")).toHaveTextContent("Deleted row b.");
	});

	/** The row and its button are gone, so a keyboard reader would otherwise be left with focus on nothing. */
	it("hands a keyboard reader the Undo button, and leaves a pointer reader where they were", async () => {
		const { user } = setup();

		screen.getByRole("button", { name: "Delete a" }).focus();
		await user.keyboard("{Enter}");
		expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus();

		await user.click(screen.getByRole("button", { name: "Delete b" }));
		expect(screen.getByRole("button", { name: "Undo" })).not.toHaveFocus();
	});

	it("sends it now on Escape", async () => {
		const { spy, user } = setup();

		screen.getByRole("button", { name: "Delete a" }).focus();
		await user.keyboard("{Enter}");
		await user.keyboard("{Escape}");

		expect(spy).toHaveBeenCalledWith("a");
	});

	it("brings the row back and says why when the delete is refused", async () => {
		const refusal = new ApiError(403, { error: { code: "missing_permission", message: "You need Manage Server." } });
		const { user } = setup(() => Promise.reject(refusal));

		await user.click(screen.getByRole("button", { name: "Delete a" }));
		await act(async () => {
			jest.advanceTimersByTime(UNDO_WINDOW_MS);
			await Promise.resolve();
		});

		expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete row a. You need Manage Server.");
		expect(screen.getByRole("button", { name: "Delete a" })).toBeInTheDocument();
	});

	/** Closing the tab is the end of the window, and the keepalive request is what survives it. */
	it("sends at once when the page is being left", async () => {
		const { spy, user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete a" }));
		act(() => {
			window.dispatchEvent(new Event("pagehide"));
		});

		expect(spy).toHaveBeenCalledWith("a");
	});

	it("sends at once when the shell goes away, as on signing out", async () => {
		const { spy, user, unmount } = setup();

		await user.click(screen.getByRole("button", { name: "Delete a" }));
		unmount();

		expect(spy).toHaveBeenCalledWith("a");
	});
});
