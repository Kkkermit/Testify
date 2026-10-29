import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { MemberDetailPage } from "@/features/members/MemberDetailPage";
import { expectNoViolations } from "@/test/axe";
import { memberDetail } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const USER = "100000000000000002";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<MemberDetailPage />, {
		route: `/guilds/${GUILD}/members/${USER}`,
		path: "/guilds/:guildId/members/:userId",
	});
}

function serve(detail: Partial<typeof memberDetail>): void {
	server.use(http.get(`/api/guilds/${GUILD}/members/${USER}`, () => HttpResponse.json({ ...memberDetail, ...detail })));
}

describe("the member detail page", () => {
	/** The screen offers one recommended action; neither Add/Take nor Set level/Change XP has a winner. */
	it("offers one recommended action, on the densest screen in the app", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "kate", level: 1 });

		const primary = [...container.querySelectorAll('[data-variant="primary"]')].map((button) =>
			button.textContent.trim(),
		);

		expect(primary).toEqual(["Add warning"]);
	});

	/** A warning can now mute, kick or ban, so whoever issued it is told what it actually did. */
	it("says what the warning did to the member", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		await userEvent.type(screen.getByLabelText(/Issue a warning/), "Being rude");
		await userEvent.click(screen.getByRole("button", { name: "Add warning" }));

		expect(await screen.findByText("Warning 2 recorded: Time out for 10 minutes.")).toBeInTheDocument();
	});

	/** No moderation controls for a caller the server would refuse anyway. */
	it("offers no moderation controls when the caller may not act", async () => {
		serve({ moderationProblem: "You cannot moderate somebody above you." });
		renderPage();

		expect(await screen.findByText("You cannot moderate somebody above you.")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Add warning" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Clear every warning/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "Money" })).not.toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "Level and XP" })).not.toBeInTheDocument();
	});

	/** Clearing deletes a record nothing can recover, so a single click must not be enough. */
	it("asks for the name before clearing every warning", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		let deleted = false;
		server.use(
			http.delete(`/api/guilds/${GUILD}/warnings/${USER}`, () => {
				deleted = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await userEvent.click(screen.getByRole("button", { name: /Clear every warning/ }));
		const confirm = screen.getByRole("button", { name: "Clear every warning" });
		expect(confirm).toBeDisabled();
		expect(deleted).toBe(false);

		await userEvent.type(screen.getByLabelText(/Type kate to clear/), "kate");
		expect(screen.getByRole("button", { name: "Clear every warning" })).toBeEnabled();
	});

	describe("kicking and banning", () => {
		/** A kick or a ban cannot be undone from here, so a stray click must not be enough to send one. */
		it("asks for the username before kicking, and sends it with the reason", async () => {
			let body: unknown;
			server.use(
				http.post(`/api/guilds/${GUILD}/members/${USER}/kick`, async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ ...memberDetail, inGuild: false });
				}),
			);
			renderPage();
			await screen.findByText("Spamming in general");

			await userEvent.click(screen.getByRole("button", { name: /^Kick$/ }));
			await userEvent.type(screen.getByLabelText("Reason"), "Raiding");
			expect(screen.getByRole("button", { name: "Kick them" })).toBeDisabled();

			await userEvent.type(screen.getByLabelText(/Type kate to confirm/), "kate");
			await userEvent.click(screen.getByRole("button", { name: "Kick them" }));

			await waitFor(() => {
				expect(body).toEqual({ reason: "Raiding", confirm: "kate" });
			});
		});

		it("takes their Discord ID in place of the username", async () => {
			renderPage();
			await screen.findByText("Spamming in general");

			await userEvent.click(screen.getByRole("button", { name: /^Kick$/ }));
			await userEvent.type(screen.getByLabelText("Reason"), "Raiding");
			await userEvent.type(screen.getByLabelText(/Type kate to confirm/), USER);

			expect(screen.getByRole("button", { name: "Kick them" })).toBeEnabled();
		});

		/** Somebody who left to dodge a ban can still be banned; a kick has nobody to reach. */
		it("offers only a ban for somebody who has left", async () => {
			serve({ inGuild: false, moderationProblem: "They are no longer in this server." });
			renderPage();
			await screen.findByText("Spamming in general");

			expect(screen.getByRole("button", { name: /^Ban$/ })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /^Kick$/ })).not.toBeInTheDocument();
		});
	});

	describe("the money controls", () => {
		/** Add stays available on the same amount, so the refusal has to be about Take alone. */
		it("refuses to take more than they hold, but still offers to add it", async () => {
			renderPage();
			await screen.findByRole("heading", { name: "Money" });

			await userEvent.type(screen.getByLabelText("Amount"), "999999");

			expect(screen.getByRole("button", { name: /Take from wallet/ })).toBeDisabled();
			expect(screen.getByRole("button", { name: /Add to wallet/ })).toBeEnabled();
			expect(screen.getByText(/only have 5,000 in their wallet/i)).toBeInTheDocument();
		});
	});

	describe("the level controls", () => {
		/** Setting a level rewrites the XP, so sending both would silently discard one of them. */
		it("refuses both at once rather than picking one", async () => {
			renderPage();
			await screen.findByRole("heading", { name: "Level and XP" });

			await userEvent.type(screen.getByLabelText(/Set the level to/), "20");
			await userEvent.type(screen.getByLabelText(/change their XP by/), "400");

			expect(screen.getByRole("button", { name: "Set level" })).toBeDisabled();
			expect(screen.getByRole("button", { name: "Change XP" })).toBeDisabled();
			expect(screen.getByText(/not both at once/i)).toBeInTheDocument();
		});
	});

	describe("the softban", () => {
		const softban = { reason: "Repeated spam", moderatorId: "1", expiresAt: "2099-01-01T00:00:00.000Z" };

		/** A softbanned user is not a member, so Lift cannot sit behind the hierarchy check. */
		it("offers to lift it even though they are not in the server", async () => {
			serve({ softban, inGuild: false, moderationProblem: "They are no longer in this server." });
			renderPage();

			let lifted = false;
			server.use(
				http.delete(`/api/guilds/${GUILD}/members/${USER}/softban`, () => {
					lifted = true;
					return HttpResponse.json({ ...memberDetail, softban: null });
				}),
			);

			await userEvent.click(await screen.findByRole("button", { name: /Lift it now/ }));

			await waitFor(() => {
				expect(lifted).toBe(true);
			});
		});

		/** A record the sweep job has not reaped yet describes nothing, so it must not read as a live restriction. */
		it("offers nothing once the softban has lapsed", async () => {
			serve({ softban: { ...softban, expiresAt: "2020-01-01T00:00:00.000Z" } });
			renderPage();
			await screen.findByRole("heading", { name: "Warnings" });

			expect(screen.queryByRole("button", { name: /Lift it now/ })).not.toBeInTheDocument();
		});
	});

	/** The back link needs a 24px target (WCAG 2.2, 2.5.8); jsdom has no layout, so this pins the class. */
	it("gives the back link enough height to be a target", async () => {
		renderPage();

		const link = await screen.findByRole("link", { name: /Back to the leaderboards/ });
		expect(link.className).toContain(INLINE_TARGET);
	});

	it("has no accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("Spamming in general");

		await expectNoViolations(container);
	});
});

describe("timeouts, nicknames and roles", () => {
	/** A timeout is a sanction like a kick, so it waits for the username before anything is sent. */
	it("asks for the username before a timeout, and sends the length and reason", async () => {
		const user = userEvent.setup();
		const captured: { body: unknown } = { body: undefined };
		server.use(
			http.post(`/api/guilds/${GUILD}/members/${USER}/timeout`, async ({ request }) => {
				captured.body = await request.json();
				return HttpResponse.json(memberDetail);
			}),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: "Time out" }));
		await user.selectOptions(screen.getByLabelText("For how long"), "1440");
		await user.type(screen.getByLabelText("Reason"), "Spam");
		expect(screen.getByRole("button", { name: "Time them out" })).toBeDisabled();

		await user.type(screen.getByLabelText(/type kate to confirm/i), "kate");
		await user.click(screen.getByRole("button", { name: "Time them out" }));

		await waitFor(() => {
			expect(captured.body).toEqual({ minutes: 1440, reason: "Spam", confirm: "kate" });
		});
	});

	it("says a reader without Manage Roles cannot change them", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/members/${USER}/roles`, () =>
				HttpResponse.json(
					{ error: { code: "missing_permission", message: "You need the Manage Roles permission." } },
					{ status: 403 },
				),
			),
		);
		renderPage();

		expect(await screen.findByText(/you need the manage roles permission to change roles/i)).toBeInTheDocument();
	});

	/** Somebody who outranks the reader can still have roles below the reader handed to them, as in Discord. */
	it("keeps the roles card when everything else is out of reach", async () => {
		serve({ moderationProblem: "They outrank you." });
		renderPage();

		expect(await screen.findByRole("heading", { name: "Roles" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Time out" })).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/^nickname/i)).not.toBeInTheDocument();
	});
});
