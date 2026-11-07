import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { UndoProvider } from "@/app/UndoProvider";
import { AccessPage } from "@/features/access/AccessPage";
import { AccessPersonPage } from "@/features/access/AccessPersonPage";
import { expectNoViolations } from "@/test/axe";
import { helper } from "@/test/fixtures/access";
import { aGuild } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderPage() {
	return renderWithProviders(<AccessPersonPage />, {
		path: "/guilds/:guildId/access/:userId",
		route: `/guilds/${aGuild.id}/access/${helper.userId}`,
	});
}

describe("one person's dashboard access", () => {
	it("says who they are, who gave them access, when they were here and what they did", async () => {
		const { container } = renderPage();

		expect(await screen.findByRole("heading", { level: 1, name: "helper" })).toBeInTheDocument();
		expect(screen.getByText(helper.userId)).toBeInTheDocument();
		expect(screen.getByText(/^by someone/i)).toBeInTheDocument();
		expect(screen.getByText(/3 in the last 90 days/i)).toBeInTheDocument();
		expect(screen.getByText("Unbanned spammer")).toBeInTheDocument();
		await expectNoViolations(container);
	});

	it("saves a changed set of screens, and only once something changed", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.put("/api/guilds/:guildId/access/:userId", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ ...helper, areas: ["bans"] });
			}),
		);
		renderPage();

		const save = await screen.findByRole("button", { name: /save 2 screens/i });
		expect(save).toBeDisabled();
		await user.click(screen.getByRole("checkbox", { name: "Warnings" }));
		await user.click(screen.getByRole("button", { name: /save 1 screen/i }));

		expect(sent).toEqual({ areas: ["bans"] });
	});

	/** Taking access away waits for Undo, so a slip of the mouse costs nobody their access. */
	it("takes access away only once the undo window has passed, and hides them from the list meanwhile", async () => {
		const user = userEvent.setup();
		let removed = false;
		server.use(
			http.delete("/api/guilds/:guildId/access/:userId", () => {
				removed = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const router = createMemoryRouter(
			[
				{
					element: (
						<UndoProvider>
							<Outlet />
						</UndoProvider>
					),
					children: [
						{ path: "/guilds/:guildId/access", element: <AccessPage /> },
						{ path: "/guilds/:guildId/access/:userId", element: <AccessPersonPage /> },
					],
				},
			],
			{ initialEntries: [`/guilds/${aGuild.id}/access/${helper.userId}`] },
		);
		render(
			<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);

		await user.click(await screen.findByRole("button", { name: "Take away access" }));

		expect(await screen.findByRole("button", { name: /undo/i })).toBeInTheDocument();
		expect(router.state.location.pathname).toBe(`/guilds/${aGuild.id}/access`);
		expect(await screen.findByText(/nobody has been given access/i)).toBeInTheDocument();
		expect(removed).toBe(false);
	});
});
