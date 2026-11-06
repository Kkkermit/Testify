import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { InvitesPage } from "@/features/invites/InvitesPage";
import { expectNoViolations } from "@/test/axe";
import { inviteOverview } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<InvitesPage />, { route: `/guilds/${GUILD}/invites`, path: "/guilds/:guildId/invites" });
}

describe("the invites page", () => {
	it("ranks inviters by who stayed and says how each member joined", async () => {
		renderPage();

		expect(await screen.findByText("3 still here · 2 left")).toBeInTheDocument();
		expect(screen.getByText(/With kermit’s invite abc123/)).toBeInTheDocument();
	});

	/** Without Manage Server Discord lists no invites, so turning it on would record nothing but unknowns. */
	it("will not turn on while the bot cannot read invites", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/invites`, () =>
				HttpResponse.json({
					...inviteOverview,
					settings: { ...inviteOverview.settings, enabled: false, canRead: false },
				}),
			),
		);
		renderPage();

		expect(await screen.findByRole("switch", { name: /Record which invite/ })).toBeDisabled();
	});

	it("turns tracking off with the switch", async () => {
		const sent: unknown[] = [];
		server.use(
			http.patch(`/api/guilds/${GUILD}/invites`, async ({ request }) => {
				sent.push(await request.json());
				return HttpResponse.json({ ...inviteOverview.settings, enabled: false });
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("switch", { name: /Record which invite/ }));
		await waitFor(() => {
			expect(sent).toEqual([{ enabled: false }]);
		});
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByText("3 still here · 2 left");

		await expectNoViolations(container);
	});
});
