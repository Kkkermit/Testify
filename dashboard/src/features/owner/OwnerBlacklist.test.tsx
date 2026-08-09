import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { blacklistRows, guildDetail } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderTab(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?tab=blacklist" });
}

describe("the blacklist tab", () => {
	it("lists who is blocked and why", async () => {
		renderTab();

		expect(await screen.findByText("spammer")).toBeInTheDocument();
		expect(screen.getByText("Spamming commands in three servers")).toBeInTheDocument();
	});

	/** An account Discord no longer knows still has to be liftable, so the row cannot depend on having a name. */
	it("shows an account Discord could not name", async () => {
		renderTab();

		expect(await screen.findByText("Unknown account")).toBeInTheDocument();
		expect(screen.getByText(blacklistRows[1]!.userId)).toBeInTheDocument();
	});

	it("sends the id and reason that were typed", async () => {
		const user = userEvent.setup();
		let sent: unknown;
		server.use(
			http.post("/api/owner/blacklist", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json(blacklistRows[0]);
			}),
		);

		renderTab();
		await user.type(await screen.findByLabelText("User ID"), "100000000000000123");
		await user.type(screen.getByLabelText(/Reason/), "Abusing the economy");
		await user.click(screen.getByRole("button", { name: /Block them/ }));

		await waitFor(() => {
			expect(sent).toEqual({ userId: "100000000000000123", reason: "Abusing the economy" });
		});
	});

	/**
	 * The API refuses anything that is not 17-20 digits, so offering the button would only produce a 400 the
	 * form could have explained first.
	 */
	it("will not submit something that is not a user ID", async () => {
		const user = userEvent.setup();
		renderTab();

		await user.type(await screen.findByLabelText("User ID"), "nonsense");

		expect(screen.getByRole("button", { name: /Block them/ })).toBeDisabled();
		expect(screen.getByText(/17 to 20 digits/)).toBeInTheDocument();
	});

	it("will not submit an empty form", async () => {
		renderTab();

		expect(await screen.findByRole("button", { name: /Block them/ })).toBeDisabled();
	});

	it("unblocks somebody", async () => {
		const user = userEvent.setup();
		let lifted: string | null = null;
		server.use(
			http.delete("/api/owner/blacklist/:userId", ({ params }) => {
				lifted = params.userId as string;
				return HttpResponse.json({ userId: params.userId });
			}),
		);

		renderTab();
		await user.click(await screen.findByRole("button", { name: "Unblock spammer" }));

		await waitFor(() => {
			expect(lifted).toBe(blacklistRows[0]!.userId);
		});
	});

	it("says so when the API refuses", async () => {
		const user = userEvent.setup();
		server.use(
			http.post("/api/owner/blacklist", () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "You cannot blacklist a bot owner." } },
					{ status: 400 },
				),
			),
		);

		renderTab();
		await user.type(await screen.findByLabelText("User ID"), "100000000000000001");
		await user.click(screen.getByRole("button", { name: /Block them/ }));

		expect(await screen.findByText("You cannot blacklist a bot owner.")).toBeInTheDocument();
	});

	it("offers nothing to lift when the list is empty", async () => {
		server.use(http.get("/api/owner/blacklist", () => HttpResponse.json([])));
		renderTab();

		expect(await screen.findByText("Nobody is blocked")).toBeInTheDocument();
	});

	it("has no accessibility violations", async () => {
		const { container } = renderTab();
		await screen.findByText("spammer");

		await expectNoViolations(container);
	});
});

describe("leaving a server", () => {
	/** The name typed has to be the one the detail card is showing, which is the guild the API answered with. */
	const NAME = guildDetail.name;

	async function openDetail(): Promise<void> {
		server.use(
			http.get("/api/owner/guilds", () =>
				HttpResponse.json({
					items: [
						{
							id: guildDetail.id,
							name: NAME,
							iconUrl: null,
							memberCount: 1_234,
							joinedAt: "2026-01-01T00:00:00.000Z",
							configured: ["levelling"],
						},
					],
					total: 1,
					page: 1,
					perPage: 25,
				}),
			),
		);

		renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?tab=overview" });
		await userEvent.click(await screen.findByRole("button", { name: new RegExp(NAME) }));
	}

	/** Rejoining needs an invite from inside the server, so a misclick has to be impossible. */
	it("keeps Leave disabled until the server's name is typed", async () => {
		await openDetail();

		const leave = await screen.findByRole("button", { name: "Leave" });
		expect(leave).toBeDisabled();

		await userEvent.type(screen.getByLabelText(/to confirm/), NAME);
		expect(screen.getByRole("button", { name: "Leave" })).toBeEnabled();
	});

	it("sends the typed name so the server can check it too", async () => {
		let sent: unknown;
		server.use(
			http.post("/api/control/guilds/:guildId/leave", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ left: guildDetail.id });
			}),
		);

		await openDetail();
		await userEvent.type(await screen.findByLabelText(/to confirm/), NAME);
		await userEvent.click(screen.getByRole("button", { name: "Leave" }));

		await waitFor(() => {
			expect(sent).toEqual({ confirm: NAME });
		});
	});

	it("closes the card once the bot has left", async () => {
		await openDetail();
		await userEvent.type(await screen.findByLabelText(/to confirm/), NAME);
		await userEvent.click(screen.getByRole("button", { name: "Leave" }));

		await waitFor(() => {
			expect(screen.queryByRole("button", { name: "Leave" })).not.toBeInTheDocument();
		});
	});

	it("explains a refusal rather than closing", async () => {
		server.use(
			http.post("/api/control/guilds/:guildId/leave", () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "That is not the server's name, so nothing was changed." } },
					{ status: 400 },
				),
			),
		);

		await openDetail();
		await userEvent.type(await screen.findByLabelText(/to confirm/), NAME);
		await userEvent.click(screen.getByRole("button", { name: "Leave" }));

		expect(await screen.findByText(/not the server's name/)).toBeInTheDocument();
		// The card stays open, so the refusal is read beside the control that caused it.
		expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
	});
});
