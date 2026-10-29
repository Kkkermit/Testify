import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { TicketsPage } from "@/features/tickets/TicketsPage";
import { expectNoViolations } from "@/test/axe";
import { ticketSettings } from "@/test/fixtures/channels";
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
	/** A category is the only thing a ticket channel can be created under, so nothing else may be offered. */
	it("offers only categories in the category picker", async () => {
		renderPage();
		await screen.findByLabelText(/^Category/);

		const options = [...screen.getByLabelText(/^Category/).querySelectorAll("option")].map((o) => o.textContent);

		expect(options).toEqual(["Choose a category", "Support"]);
	});

	/** A required picker used to show its first channel while holding nothing, so the form refused what it displayed. */
	it("lets the destinations be chosen in any order, and counts the ones already saved", async () => {
		const user = userEvent.setup();
		serve({ panelChannelId: null, transcriptChannelId: null });
		renderPage();
		const panel = await screen.findByRole("combobox", { name: /Panel channel/ });

		expect(panel).toHaveValue("");
		expect(
			screen.getByText(/Choose where the panel is posted\. Choose where transcripts are sent\./),
		).toBeInTheDocument();

		await user.selectOptions(screen.getByRole("combobox", { name: /Transcripts/ }), "400000000000000001");
		expect(screen.getByText("Choose where the panel is posted.")).toBeInTheDocument();

		await user.selectOptions(panel, "400000000000000001");
		expect(screen.queryByText(/Choose where/)).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
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

describe("open tickets", () => {
	/** Closing deletes the channel, so one press only asks; the second press is the one that closes it. */
	it("asks before it closes a ticket, then closes it", async () => {
		const user = userEvent.setup();
		let closed = "";
		server.use(
			http.post("/api/guilds/:guildId/tickets/open/:channelId/close", ({ params }) => {
				closed = String(params.channelId);
				return HttpResponse.json({ canClose: true, tickets: [] });
			}),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: "Close #ticket-a1b2c3" }));
		expect(closed).toBe("");
		await user.click(screen.getByRole("button", { name: "Close the ticket" }));

		await waitFor(() => {
			expect(closed).toBe("400000000000000020");
		});
		expect(await screen.findByText("No tickets are open")).toBeInTheDocument();
	});
});
