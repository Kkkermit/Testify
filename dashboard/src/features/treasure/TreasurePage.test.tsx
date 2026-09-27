import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { TreasurePage } from "@/features/treasure/TreasurePage";
import { expectNoViolations } from "@/test/axe";
import { treasureSettings } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<TreasurePage />, {
		route: `/guilds/${GUILD}/treasure`,
		path: "/guilds/:guildId/treasure",
	});
}

describe("the treasure page", () => {
	it("shows what the current settings actually mean, not just the numbers", async () => {
		renderPage();

		expect(await screen.findByText(/A drop of 10–500 every 15–50 messages/)).toBeInTheDocument();
	});

	/** The card says "in this server", so it has to keep describing the saved values while a draft is typed. */
	it("does not let the summary follow an unsaved edit", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByLabelText(/smallest drop/i);

		await user.clear(screen.getByLabelText(/smallest drop/i));
		await user.type(screen.getByLabelText(/smallest drop/i), "250");

		expect(screen.getByText(/A drop of 10–500 every 15–50 messages/)).toBeInTheDocument();
	});

	/** An unconfigured server is showing defaults, and calling them settings would be a lie. */
	it("says the numbers are only defaults until drops are turned on", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/treasure`, () =>
				HttpResponse.json({ ...treasureSettings, enabled: false, configured: false }),
			),
		);
		renderPage();

		expect(await screen.findByText(/Not set up yet/i)).toBeInTheDocument();
	});

	it("sends only the switch when it is flipped", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.patch(`/api/guilds/${GUILD}/treasure`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ ...treasureSettings, enabled: false });
			}),
		);
		renderPage();
		await screen.findByRole("switch", { name: /enable treasure drops/i });

		await user.click(screen.getByRole("switch", { name: /enable treasure drops/i }));

		await waitFor(() => {
			expect(sent).toEqual({ enabled: false });
		});
	});

	/** Save appears only once something has changed, so an untouched page cannot post a no-op write. */
	it("keeps Save unavailable until a number changes", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByLabelText(/smallest drop/i);

		expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();

		await user.clear(screen.getByLabelText(/smallest drop/i));
		await user.type(screen.getByLabelText(/smallest drop/i), "25");

		expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
	});

	it("sends every number together, with the cooldown back in milliseconds", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.patch(`/api/guilds/${GUILD}/treasure`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json(treasureSettings);
			}),
		);
		renderPage();
		await screen.findByLabelText(/^cooldown/i);

		await user.clear(screen.getByLabelText(/^cooldown/i));
		await user.type(screen.getByLabelText(/^cooldown/i), "10");
		await user.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(sent).toEqual({
				minMessages: 15,
				maxMessages: 50,
				minAmount: 10,
				maxAmount: 500,
				cooldownMs: 600_000,
			});
		});
	});

	/** Pressing Save on an impossible range would only earn a 400, so the page says so first. */
	it("refuses a range the wrong way round before it is sent", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByLabelText(/fewest messages/i);

		await user.clear(screen.getByLabelText(/fewest messages/i));
		await user.type(screen.getByLabelText(/fewest messages/i), "90");

		expect(await screen.findByText(/fewest messages cannot be more than the most/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
	});

	it("resets every number without asking the browser for them", async () => {
		const user = userEvent.setup();
		let hit = false;
		server.use(
			http.post(`/api/guilds/${GUILD}/treasure/reset`, () => {
				hit = true;
				return HttpResponse.json(treasureSettings);
			}),
		);
		renderPage();
		await screen.findByRole("button", { name: /reset to defaults/i });

		await user.click(screen.getByRole("button", { name: /reset to defaults/i }));

		await waitFor(() => {
			expect(hit).toBe(true);
		});
	});

	it("shows what the server said when a save is refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch(`/api/guilds/${GUILD}/treasure`, () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "The smallest drop cannot be more than the largest." } },
					{ status: 400 },
				),
			),
		);
		renderPage();
		await screen.findByRole("switch", { name: /enable treasure drops/i });

		await user.click(screen.getByRole("switch", { name: /enable treasure drops/i }));

		expect(await screen.findByText(/smallest drop cannot be more/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByLabelText(/smallest drop/i);

		await expectNoViolations(container);
	});
});
