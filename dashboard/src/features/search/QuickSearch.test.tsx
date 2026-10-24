import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { AppShell } from "@/app/AppShell";
import { expectNoViolations } from "@/test/axe";
import { aGuild } from "@/test/handlers";

function Where(): React.JSX.Element {
	const location = useLocation();
	return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

function renderShell(route = `/guilds/${aGuild.id}`): ReturnType<typeof render> {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const router = createMemoryRouter(
		[
			{
				path: "/",
				element: <AppShell />,
				children: [
					{ path: "guilds/:guildId/*", element: <Where /> },
					{ path: "*", element: <Where /> },
				],
			},
		],
		{ initialEntries: [route] },
	);

	return render(
		<QueryClientProvider client={client}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
}

async function openWithShortcut(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
	await screen.findByRole("button", { name: "Test Server, change server" });
	await user.keyboard("{Control>}k{/Control}");
	return screen.findByRole("dialog", { name: "Quick search" });
}

describe("quick search", () => {
	it("opens on Ctrl+K with the box focused, and on ⌘K too", async () => {
		const user = userEvent.setup();
		renderShell();

		await openWithShortcut(user);
		expect(screen.getByRole("combobox", { name: "Search screens, servers and commands" })).toHaveFocus();

		await user.keyboard("{Escape}");
		await user.keyboard("{Meta>}k{/Meta}");
		expect(await screen.findByRole("dialog", { name: "Quick search" })).toBeInTheDocument();
	});

	it("opens from the phone header's button too", async () => {
		const user = userEvent.setup();
		renderShell();

		await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Search" }));

		expect(await screen.findByRole("dialog", { name: "Quick search" })).toBeInTheDocument();
	});

	it("opens from the sidebar's button, which says its shortcut", async () => {
		const user = userEvent.setup();
		renderShell();

		const opener = within(screen.getByTestId("sidebar")).getByRole("button", { name: "Search" });
		expect(opener).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
		await user.click(opener);

		expect(await screen.findByRole("dialog", { name: "Quick search" })).toBeInTheDocument();
	});

	/** Typing "welcome" and pressing Enter is the whole journey the feature was asked for. */
	it("goes to the best match on Enter", async () => {
		const user = userEvent.setup();
		renderShell();

		await openWithShortcut(user);
		await user.keyboard("welcome");
		await user.keyboard("{Enter}");

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByTestId("where")).toHaveTextContent(`/guilds/${aGuild.id}/welcome`);
	});

	it("moves the highlight with the arrow keys, and says which row is highlighted", async () => {
		const user = userEvent.setup();
		renderShell();

		await openWithShortcut(user);
		await user.keyboard("levelling");
		const box = screen.getByRole("combobox");
		const options = within(screen.getByRole("listbox")).getAllByRole("option");

		expect(options[0]).toHaveAttribute("aria-selected", "true");
		expect(box).toHaveAttribute("aria-activedescendant", options[0]?.id);

		await user.keyboard("{ArrowDown}");
		expect(options[1]).toHaveAttribute("aria-selected", "true");
		expect(box).toHaveAttribute("aria-activedescendant", options[1]?.id);

		await user.keyboard("{ArrowUp}{ArrowUp}");
		expect(options.at(-1)).toHaveAttribute("aria-selected", "true");
	});

	it("sends a command to the screen that sets it up", async () => {
		const user = userEvent.setup();
		renderShell();

		await openWithShortcut(user);
		await user.keyboard("ban");
		await screen.findByRole("option", { name: /\/ban/ });
		await user.click(screen.getByRole("option", { name: /\/ban/ }));

		expect(screen.getByTestId("where")).toHaveTextContent(`/guilds/${aGuild.id}/members`);
	});

	it("says when nothing matches, and counts the results for a screen reader", async () => {
		const user = userEvent.setup();
		renderShell();

		const dialog = await openWithShortcut(user);
		expect(within(dialog).getByRole("status")).toHaveTextContent("8 results");

		await user.keyboard("zzqx");
		expect(within(dialog).getByText("Nothing matches “zzqx”.")).toBeInTheDocument();
		expect(within(dialog).getByRole("status")).toHaveTextContent("0 results");
	});

	it("closes on Escape and hands focus back to what had it", async () => {
		const user = userEvent.setup();
		renderShell();

		const opener = within(screen.getByTestId("sidebar")).getByRole("button", { name: "Search" });
		await user.click(opener);
		await screen.findByRole("dialog", { name: "Quick search" });
		await user.keyboard("{Escape}");

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(opener).toHaveFocus();
	});

	it("keeps Tab inside the dialog", async () => {
		const user = userEvent.setup();
		renderShell();

		await openWithShortcut(user);
		await user.tab();

		expect(screen.getByRole("combobox")).toHaveFocus();
	});

	it("passes axe while open", async () => {
		const user = userEvent.setup();
		const { container } = renderShell();

		await openWithShortcut(user);
		await user.keyboard("set");

		await expectNoViolations(container);
	});
});
