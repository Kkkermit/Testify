import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { OWNER_ONLY_NOTICE, RequireOwner } from "@/app/RequireOwner";
import { GuildPickerPage } from "@/features/guilds/GuildPickerPage";
import { useOwnerStats } from "@/features/owner/useOwner";
import { me } from "@/test/handlers";
import { server } from "@/test/setup";

function Console(): React.JSX.Element {
	const stats = useOwnerStats();
	return (
		<div>
			<h1>Owner console</h1>
			<button type="button" onClick={() => void stats.refetch()}>
				Reload
			</button>
		</div>
	);
}

function Landing(): React.JSX.Element {
	const state = useLocation().state as { notice?: string } | null;
	return <p>Landed with {state?.notice ?? "no notice"}</p>;
}

function visitOwner(): { router: ReturnType<typeof createMemoryRouter> } {
	const router = createMemoryRouter(
		[
			{ element: <RequireOwner />, children: [{ path: "/owner", element: <Console /> }] },
			{ path: "/guilds", element: <Landing /> },
		],
		{ initialEntries: ["/owner"] },
	);
	render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
	return { router };
}

function claimsOwner(isOwner: boolean): void {
	server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, isOwner })));
}

function accessAnswers(status: number): void {
	server.use(http.get("/api/owner/access", () => new HttpResponse(null, { status })));
}

describe("reaching /owner", () => {
	it("sends somebody who is not the owner home with a notice, and never asks the server", async () => {
		claimsOwner(false);
		let asked = false;
		server.use(
			http.get("/api/owner/access", () => {
				asked = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const { router } = visitOwner();

		expect(await screen.findByText(`Landed with ${OWNER_ONLY_NOTICE}`)).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/guilds");
		expect(asked).toBe(false);
	});

	/** The report: `isOwner` rewritten to true in the browser drew the console, because nothing else was asked. */
	it("ejects a rewritten /me the server does not agree with, without drawing the console", async () => {
		claimsOwner(true);
		accessAnswers(404);
		const { router } = visitOwner();

		expect(await screen.findByText(`Landed with ${OWNER_ONLY_NOTICE}`)).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/guilds");
		expect(screen.queryByRole("heading", { name: "Owner console" })).toBeNull();
	});

	it("lets the owner through once the server confirms", async () => {
		claimsOwner(true);
		visitOwner();

		expect(await screen.findByRole("heading", { name: "Owner console" })).toBeInTheDocument();
	});

	/** A bot restarting is not somebody losing ownership, so the owner gets a retry rather than the door. */
	it("offers a retry rather than ejecting when the check itself fails", async () => {
		claimsOwner(true);
		accessAnswers(503);
		const { router } = visitOwner();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/owner");
	});

	it("ejects mid-session once the server stops treating the reader as the owner", async () => {
		const user = userEvent.setup();
		claimsOwner(true);
		const { router } = visitOwner();
		await screen.findByRole("heading", { name: "Owner console" });

		accessAnswers(404);
		server.use(
			http.get("/api/owner/stats", () =>
				HttpResponse.json({ error: { code: "not_found", message: "" } }, { status: 404 }),
			),
		);
		await user.click(screen.getByRole("button", { name: "Reload" }));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/guilds");
		});
	});

	it("keeps the owner in place when a refusal turns out to be about something else", async () => {
		const user = userEvent.setup();
		claimsOwner(true);
		const { router } = visitOwner();
		await screen.findByRole("heading", { name: "Owner console" });

		server.use(
			http.get("/api/owner/stats", () =>
				HttpResponse.json({ error: { code: "not_found", message: "" } }, { status: 404 }),
			),
		);
		await user.click(screen.getByRole("button", { name: "Reload" }));
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(router.state.location.pathname).toBe("/owner");
		expect(screen.getByRole("heading", { name: "Owner console" })).toBeInTheDocument();
	});
});

describe("the server list after being sent back", () => {
	it("says why, and takes the notice out of history so a refresh does not repeat it", async () => {
		const router = createMemoryRouter([{ path: "/guilds", element: <GuildPickerPage /> }], {
			initialEntries: [{ pathname: "/guilds", state: { notice: OWNER_ONLY_NOTICE } }],
		});
		render(
			<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);

		expect(await screen.findByText(/you don’t have permission to view that page/i)).toBeInTheDocument();
		await waitFor(() => {
			expect(router.state.location.state).toBeNull();
		});
	});
});
