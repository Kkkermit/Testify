import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { TicketsPage } from "@/features/tickets/TicketsPage";
import { expectNoViolations } from "@/test/axe";
import { ticketSettings } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<TicketsPage />, { route: `/guilds/${GUILD}/tickets`, path: "/guilds/:guildId/tickets" });
}

function serve(settings: Partial<typeof ticketSettings>): void {
	server.use(http.get(`/api/guilds/${GUILD}/tickets`, () => HttpResponse.json({ ...ticketSettings, ...settings })));
}

describe("the tickets page", () => {
	it("says how many tickets are open right now", async () => {
		renderPage();

		expect(await screen.findByText(/3 open right now/i)).toBeInTheDocument();
	});

	it("marks a server whose panel is already posted", async () => {
		renderPage();

		expect(await screen.findByText("Panel posted")).toBeInTheDocument();
	});

	/** A category is the only thing a ticket channel can be created under, so nothing else may be offered. */
	it("offers only categories in the category picker", async () => {
		renderPage();
		await screen.findByLabelText(/^Category/);

		const options = [...screen.getByLabelText(/^Category/).querySelectorAll("option")].map((o) => o.textContent);

		expect(options).toEqual(["Choose a category", "Support"]);
	});

	it("sends every destination together when saved", async () => {
		const user = userEvent.setup();
		let sent: Record<string, unknown> | null = null;
		server.use(
			http.patch(`/api/guilds/${GUILD}/tickets`, async ({ request }) => {
				sent = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(ticketSettings);
			}),
		);
		renderPage();
		await screen.findByLabelText(/button label/i);

		await user.clear(screen.getByLabelText(/button label/i));
		await user.type(screen.getByLabelText(/button label/i), "Get help");
		await user.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(sent).toMatchObject({ buttonLabel: "Get help", categoryId: "400000000000000005" });
		});
	});

	/** Saving must not post a panel: the message is public and posting is its own button. */
	it("does not ask to publish when only saving", async () => {
		const user = userEvent.setup();
		let sent: Record<string, unknown> | null = null;
		server.use(
			http.patch(`/api/guilds/${GUILD}/tickets`, async ({ request }) => {
				sent = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(ticketSettings);
			}),
		);
		renderPage();
		await screen.findByLabelText(/button label/i);

		await user.clear(screen.getByLabelText(/button label/i));
		await user.type(screen.getByLabelText(/button label/i), "Help");
		await user.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(sent).not.toBeNull();
		});
		expect(sent).not.toHaveProperty("publish");
	});

	it("asks to publish when the post button is used", async () => {
		const user = userEvent.setup();
		let sent: Record<string, unknown> | null = null;
		server.use(
			http.patch(`/api/guilds/${GUILD}/tickets`, async ({ request }) => {
				sent = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(ticketSettings);
			}),
		);
		renderPage();
		await screen.findByRole("button", { name: /update the panel/i });

		await user.click(screen.getByRole("button", { name: /update the panel/i }));

		await waitFor(() => {
			expect(sent).toMatchObject({ publish: true });
		});
	});

	/** Posting is what the whole page is for, so an unconfigured server has to say what is still missing. */
	it("refuses to post until every destination is chosen", async () => {
		serve({ enabled: false, panelChannelId: null, categoryId: null, posted: false, openTickets: 0 });
		renderPage();

		expect(await screen.findByText(/where the panel is posted/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /post the panel/i })).toBeDisabled();
	});

	/** There is nothing to turn off on a server that never set tickets up, and offering it would only 404. */
	it("offers to turn tickets off only when they are on", async () => {
		serve({ enabled: false, posted: false });
		renderPage();
		await screen.findByLabelText(/button label/i);

		expect(screen.queryByRole("button", { name: /turn off/i })).not.toBeInTheDocument();
	});

	it("turns tickets off", async () => {
		const user = userEvent.setup();
		let hit = false;
		server.use(
			http.delete(`/api/guilds/${GUILD}/tickets`, () => {
				hit = true;
				return HttpResponse.json({ ...ticketSettings, enabled: false });
			}),
		);
		renderPage();
		await screen.findByRole("button", { name: /turn off/i });

		await user.click(screen.getByRole("button", { name: /turn off/i }));

		await waitFor(() => {
			expect(hit).toBe(true);
		});
	});

	it("shows what the server said when a save is refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch(`/api/guilds/${GUILD}/tickets`, () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "I cannot post in that channel any more." } },
					{ status: 400 },
				),
			),
		);
		renderPage();
		await screen.findByRole("button", { name: /update the panel/i });

		await user.click(screen.getByRole("button", { name: /update the panel/i }));

		expect(await screen.findByText(/cannot post in that channel/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByLabelText(/button label/i);

		await expectNoViolations(container);
	});
});
