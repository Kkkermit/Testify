import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { GUILD_REFUSED_NOTICE, RequireGuild } from "@/app/RequireGuild";
import { GuildPickerPage } from "@/features/guilds/GuildPickerPage";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";
import { aGuild } from "@/test/handlers";
import { server } from "@/test/setup";

const GUILD = aGuild.id;

function refusal(status: number, code: string) {
	return HttpResponse.json({ error: { code, message: "" } }, { status });
}

function Screen(): React.JSX.Element {
	const settings = useQuery({
		queryKey: keys.guild(GUILD).settings(),
		queryFn: () => api.get(`/guilds/${GUILD}/settings`),
	});
	const kick = useMutation({ mutationFn: () => api.post(`/guilds/${GUILD}/members/1/kick`, {}) });
	return (
		<div>
			<h1>Server settings</h1>
			<button type="button" onClick={() => void settings.refetch()}>
				Reload
			</button>
			<button type="button" onClick={() => kick.mutate()}>
				Kick
			</button>
		</div>
	);
}

function Landing(): React.JSX.Element {
	const state = useLocation().state as { notice?: string } | null;
	return <p>Landed with {state?.notice ?? "no notice"}</p>;
}

function visit(): { router: ReturnType<typeof createMemoryRouter> } {
	const router = createMemoryRouter(
		[
			{ element: <RequireGuild />, children: [{ path: "/guilds/:guildId/settings", element: <Screen /> }] },
			{ path: "/guilds", element: <Landing /> },
		],
		{ initialEntries: [`/guilds/${GUILD}/settings`] },
	);
	render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
	return { router };
}

function overviewAnswers(response: () => Response): void {
	server.use(http.get(`/api/guilds/${GUILD}/overview`, response));
}

describe("reaching a server's screens", () => {
	/** A guild list rewritten in the browser offered a server the reader cannot manage; the page drew its screens. */
	it.each([
		["without Manage Server", 403, "missing_manage_guild"],
		["as somebody not in the server", 403, "not_a_member"],
		["signed out", 401, "unauthorised"],
	])("sends somebody %s home with a notice, without drawing the screen", async (_, status, code) => {
		overviewAnswers(() => refusal(status, code));
		const { router } = visit();

		expect(await screen.findByText(`Landed with ${GUILD_REFUSED_NOTICE}`)).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/guilds");
		expect(screen.queryByRole("heading", { name: "Server settings" })).toBeNull();
	});

	it("draws the screen once the server confirms", async () => {
		visit();

		expect(await screen.findByRole("heading", { name: "Server settings" })).toBeInTheDocument();
	});

	/** The bot having left, or the bot restarting, is each screen's own to explain; neither is a lack of permission. */
	it.each([
		["the bot has left", 404, "guild_not_found"],
		["the bot is restarting", 503, "unavailable"],
	])("leaves the reader in place when %s", async (_, status, code) => {
		overviewAnswers(() => refusal(status, code));
		const { router } = visit();

		expect(await screen.findByRole("heading", { name: "Server settings" })).toBeInTheDocument();
		expect(router.state.location.pathname).toBe(`/guilds/${GUILD}/settings`);
	});

	it("ejects mid-session once the server stops letting the reader manage it", async () => {
		const user = userEvent.setup();
		const { router } = visit();
		await screen.findByRole("heading", { name: "Server settings" });

		overviewAnswers(() => refusal(403, "missing_manage_guild"));
		server.use(http.get(`/api/guilds/${GUILD}/settings`, () => refusal(403, "missing_manage_guild")));
		await user.click(screen.getByRole("button", { name: "Reload" }));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/guilds");
		});
	});

	/** Lacking Kick Members is about one action, not about the server, so the manager stays where they are. */
	it("keeps a manager in place when only one action is refused", async () => {
		const user = userEvent.setup();
		server.use(http.post(`/api/guilds/${GUILD}/members/1/kick`, () => refusal(403, "missing_permission")));
		const { router } = visit();
		await screen.findByRole("heading", { name: "Server settings" });

		await user.click(screen.getByRole("button", { name: "Kick" }));
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(router.state.location.pathname).toBe(`/guilds/${GUILD}/settings`);
	});
});

describe("the server list after being sent back from a server", () => {
	it("says why", async () => {
		const router = createMemoryRouter([{ path: "/guilds", element: <GuildPickerPage /> }], {
			initialEntries: [{ pathname: "/guilds", state: { notice: GUILD_REFUSED_NOTICE } }],
		});
		render(
			<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);

		expect(await screen.findByText(/you don’t have permission to manage that server/i)).toBeInTheDocument();
	});
});
