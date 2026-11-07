import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ACCESS_AREAS, type GuildOverview, READER_PERMISSIONS } from "@testify/shared";
import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { RequireGuild } from "@/app/RequireGuild";
import { UndoProvider } from "@/app/UndoProvider";
import { AccessPage } from "@/features/access/AccessPage";
import { AccessPersonPage } from "@/features/access/AccessPersonPage";
import { helper } from "@/test/fixtures/access";
import { overview } from "@/test/fixtures/server";
import { aGuild } from "@/test/fixtures/session";
import { server } from "@/test/setup";

const GUILD = aGuild.id;

function visit(path: string, reader: Partial<GuildOverview>): { asked: string[] } {
	const asked: string[] = [];
	server.use(
		http.get(`/api/guilds/${GUILD}/overview`, () => HttpResponse.json({ ...overview, ...reader })),
		http.all(`/api/guilds/${GUILD}/access*`, ({ request }) => {
			asked.push(`${request.method} ${new URL(request.url).pathname}`);
			return HttpResponse.json({ error: { code: "missing_permission", message: "" } }, { status: 403 });
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
					{
						element: <RequireGuild />,
						children: [
							{ path: "/guilds/:guildId/access", element: <AccessPage /> },
							{ path: "/guilds/:guildId/access/:userId", element: <AccessPersonPage /> },
						],
					},
				],
			},
		],
		{ initialEntries: [path] },
	);
	render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
	return { asked };
}

const MANAGER = { yourAreas: null, yourPermissions: READER_PERMISSIONS.filter((name) => name !== "Administrator") };
const GRANTEE = { yourAreas: [...ACCESS_AREAS], yourPermissions: [...READER_PERMISSIONS] };

const PAGES = [`/guilds/${GUILD}/access`, `/guilds/${GUILD}/access/${helper.userId}`];

describe("the dashboard access screens, for somebody who may not hand screens out", () => {
	/** Every screen there is is still not the access panel, so somebody given all of them is not given it. */
	it("are closed to somebody given every screen, and ask the API nothing", async () => {
		for (const path of PAGES) {
			const { asked } = visit(path, GRANTEE);

			expect(await screen.findByText(/your access to this server doesn’t include this screen/i)).toBeInTheDocument();
			expect(screen.queryByLabelText(/their user id/i)).toBeNull();
			expect(asked).toEqual([]);
			cleanup();
		}
	});

	/** Manage Server sees every screen but cannot widen anybody's reach, so the panel names what it needs instead. */
	it("name Administrator for a manager without it, and ask the API nothing", async () => {
		for (const path of PAGES) {
			const { asked } = visit(path, MANAGER);

			expect(await screen.findByText(/you need the administrator permission/i)).toBeInTheDocument();
			expect(screen.queryByLabelText(/their user id/i)).toBeNull();
			expect(screen.queryByRole("button", { name: /take away access/i })).toBeNull();
			expect(asked).toEqual([]);
			cleanup();
		}
	});
});
