import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { LotteryPage } from "@/features/lottery/LotteryPage";
import { expectNoViolations } from "@/test/axe";
import { lotterySettings } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<LotteryPage />, { route: `/guilds/${GUILD}/lottery`, path: "/guilds/:guildId/lottery" });
}

function serve(settings: Partial<typeof lotterySettings>): void {
	server.use(http.get(`/api/guilds/${GUILD}/lottery`, () => HttpResponse.json({ ...lotterySettings, ...settings })));
}

function capturePatch(): { body: Record<string, unknown> | null } {
	const captured: { body: Record<string, unknown> | null } = { body: null };
	server.use(
		http.patch(`/api/guilds/${GUILD}/lottery`, async ({ request }) => {
			captured.body = (await request.json()) as Record<string, unknown>;
			return HttpResponse.json(lotterySettings);
		}),
	);
	return captured;
}

describe("the lottery page", () => {
	it("shows the live pot and the tickets behind it", async () => {
		renderPage();

		expect(await screen.findByText("Prize pool")).toBeInTheDocument();
		expect(screen.getByText("Tickets sold")).toBeInTheDocument();
	});

	it("says whether it is running or frozen", async () => {
		renderPage();
		expect(await screen.findByText("Running")).toBeInTheDocument();

		serve({ frozen: true });
		renderPage();
		await waitFor(() => {
			expect(screen.getAllByText("Frozen").length).toBeGreaterThan(0);
		});
	});

	/** Freezing stops entries without ending the draw, so it must not carry the rest of the form with it. */
	it("sends only the freeze flag when freezing", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();
		renderPage();
		await screen.findByRole("button", { name: /freeze/i });

		await user.click(screen.getByRole("button", { name: /freeze/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ frozen: true });
		});
	});

	it("warns before a frequency change moves the next draw", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByLabelText(/^Draw/);

		await user.selectOptions(screen.getByLabelText(/^Draw/), "daily");

		expect(await screen.findByText(/moves the next draw/i)).toBeInTheDocument();
	});

	it("sends the whole configuration when saved", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();
		renderPage();
		await screen.findByLabelText(/ticket price/i);

		await user.clear(screen.getByLabelText(/ticket price/i));
		await user.type(screen.getByLabelText(/ticket price/i), "250");
		await user.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(captured.body).toMatchObject({ entryFee: 250, frequency: "weekly", maxWinners: 2 });
		});
	});

	/** A server with no lottery yet is creating one, and "Save changes" would not say that. */
	it("offers to start one when none is running", async () => {
		serve({ enabled: false, announcementChannelId: null, prizePool: 0, ticketsSold: 0, entrants: 0 });
		renderPage();

		expect(await screen.findByRole("button", { name: /start the lottery/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /^freeze$/i })).not.toBeInTheDocument();
	});

	it("refuses more winners than the limit before sending", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByLabelText(/winners a draw/i);

		await user.clear(screen.getByLabelText(/winners a draw/i));
		await user.type(screen.getByLabelText(/winners a draw/i), "99");

		expect(await screen.findByText(/between 1 and 10 winners/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
	});

	/** Ending a lottery takes the pot with it, so a single stray click must not do it. */
	it("asks before ending the lottery", async () => {
		const user = userEvent.setup();
		let ended = false;
		server.use(
			http.delete(`/api/guilds/${GUILD}/lottery`, () => {
				ended = true;
				return HttpResponse.json({ ...lotterySettings, enabled: false });
			}),
		);
		renderPage();
		await screen.findByRole("button", { name: /end it/i });

		await user.click(screen.getByRole("button", { name: /end it/i }));
		expect(ended).toBe(false);

		await user.click(screen.getByRole("button", { name: /yes, end it/i }));

		await waitFor(() => {
			expect(ended).toBe(true);
		});
	});

	it("lists the past draws and who won them", async () => {
		renderPage();

		expect(await screen.findByText(/kate/)).toBeInTheDocument();
	});

	it("says so when no draw has run yet", async () => {
		serve({ history: [] });
		renderPage();

		expect(await screen.findByText(/no draws yet/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByLabelText(/ticket price/i);

		await expectNoViolations(container);
	});
});
