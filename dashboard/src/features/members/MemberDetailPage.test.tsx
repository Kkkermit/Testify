import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { MemberDetailPage } from "@/features/members/MemberDetailPage";
import { expectNoViolations } from "@/test/axe";
import { memberDetail, warningAdded } from "@/test/handlers";
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

function captureWarn(): { body: Record<string, unknown> | null } {
	const captured: { body: Record<string, unknown> | null } = { body: null };
	server.use(
		http.post(`/api/guilds/${GUILD}/warnings`, async ({ request }) => {
			captured.body = (await request.json()) as Record<string, unknown>;
			return HttpResponse.json(warningAdded);
		}),
	);
	return captured;
}

describe("the member detail page", () => {
	it("shows who they are and where they stand", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { name: "kate", level: 1 })).toBeInTheDocument();

		// "Wallet" is also a purse segment further down, so this asks the standing list rather than the page.
		const standing = screen.getByRole("heading", { name: "Standing in this server" }).parentElement;
		expect(within(standing!).getByText("Wallet")).toBeInTheDocument();
		expect(within(standing!).getByText("Level rank")).toBeInTheDocument();
	});

	/** The screen offers one recommended action; neither Add/Take nor Set level/Change XP has a winner. */
	it("offers one recommended action, on the densest screen in the app", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "kate", level: 1 });

		const primary = [...container.querySelectorAll('[data-variant="primary"]')].map((button) =>
			button.textContent.trim(),
		);

		expect(primary).toEqual(["Add warning"]);
	});

	it("lists the warnings on record", async () => {
		renderPage();

		expect(await screen.findByText("Spamming in general")).toBeInTheDocument();
		expect(screen.getByText("1 warning on record.")).toBeInTheDocument();
	});

	it("sends the reason that was typed", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		const captured = captureWarn();
		await userEvent.type(screen.getByLabelText(/Issue a warning/), "Being rude");
		await userEvent.click(screen.getByRole("button", { name: "Add warning" }));

		await waitFor(() => {
			expect(captured.body).toEqual({ userId: USER, reason: "Being rude" });
		});
	});

	/** A warning can now mute, kick or ban, so whoever issued it is told what it actually did. */
	it("says what the warning did to the member", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		await userEvent.type(screen.getByLabelText(/Issue a warning/), "Being rude");
		await userEvent.click(screen.getByRole("button", { name: "Add warning" }));

		expect(await screen.findByText("Warning 2 recorded: Time out for 10 minutes.")).toBeInTheDocument();
	});

	it("rewrites a warning's reason in place", async () => {
		let body: unknown;
		server.use(
			http.patch(`/api/guilds/${GUILD}/warnings/${USER}/a1b2c3d4`, async ({ request }) => {
				body = await request.json();
				return HttpResponse.json({ ...warningAdded.warning, reason: "Rude", edited: true });
			}),
		);
		renderPage();
		await screen.findByText("Spamming in general");

		await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
		const field = screen.getByLabelText("New reason");
		await userEvent.clear(field);
		await userEvent.type(field, "Rude");
		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(body).toEqual({ reason: "Rude" });
		});
	});

	it("will not send an empty reason", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		expect(screen.getByRole("button", { name: "Add warning" })).toBeDisabled();
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

	it("still shows the record for somebody who has left", async () => {
		serve({ inGuild: false, moderationProblem: "They are no longer in this server." });
		renderPage();

		expect(await screen.findByText("Left the server")).toBeInTheDocument();
		expect(screen.getByText("Spamming in general")).toBeInTheDocument();
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

	it("removes a single warning", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		let removed: string | null = null;
		server.use(
			http.delete(`/api/guilds/${GUILD}/warnings/${USER}/:warnId`, ({ params }) => {
				removed = params.warnId as string;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await userEvent.click(screen.getByRole("button", { name: /^Remove$/ }));

		await waitFor(() => {
			expect(removed).toBe("a1b2c3d4");
		});
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

		it("sends the days of messages to delete with a ban", async () => {
			let body: unknown;
			server.use(
				http.post(`/api/guilds/${GUILD}/members/${USER}/ban`, async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ ...memberDetail, inGuild: false });
				}),
			);
			renderPage();
			await screen.findByText("Spamming in general");

			await userEvent.click(screen.getByRole("button", { name: /^Ban$/ }));
			await userEvent.type(screen.getByLabelText("Reason"), "Raiding");
			await userEvent.selectOptions(screen.getByLabelText(/Delete their recent messages/), "2");
			await userEvent.type(screen.getByLabelText(/Type kate to confirm/), "kate");
			await userEvent.click(screen.getByRole("button", { name: "Ban them" }));

			await waitFor(() => {
				expect(body).toEqual({ reason: "Raiding", confirm: "kate", deleteDays: 2 });
			});
		});

		/** Somebody who left to dodge a ban can still be banned; a kick has nobody to reach. */
		it("offers only a ban for somebody who has left", async () => {
			serve({ inGuild: false, moderationProblem: "They are no longer in this server." });
			renderPage();
			await screen.findByText("Spamming in general");

			expect(screen.getByRole("button", { name: /^Ban$/ })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /^Kick$/ })).not.toBeInTheDocument();
		});

		it("offers neither to somebody the caller sits below", async () => {
			serve({ moderationProblem: "You cannot moderate somebody above you." });
			renderPage();
			await screen.findByText("Spamming in general");

			expect(screen.queryByRole("button", { name: /^Ban$/ })).not.toBeInTheDocument();
		});
	});

	it("shows the softban when one is live", async () => {
		serve({
			softban: { reason: "Repeated spam", moderatorId: "1", expiresAt: "2099-01-01T00:00:00.000Z" },
		});
		renderPage();

		expect(await screen.findByText("Repeated spam")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /Active softban/ })).toBeInTheDocument();
		expect(screen.getByText("Softbanned")).toBeInTheDocument();
	});

	describe("the money controls", () => {
		function captureMoney(): { body: Record<string, unknown> | null } {
			const captured: { body: Record<string, unknown> | null } = { body: null };
			server.use(
				http.patch(`/api/guilds/${GUILD}/members/${USER}/money`, async ({ request }) => {
					captured.body = (await request.json()) as Record<string, unknown>;
					return HttpResponse.json(memberDetail);
				}),
			);
			return captured;
		}

		it("adds to the wallet as a positive change", async () => {
			renderPage();
			await screen.findByRole("heading", { name: "Money" });

			const captured = captureMoney();
			await userEvent.type(screen.getByLabelText("Amount"), "250");
			await userEvent.click(screen.getByRole("button", { name: /Add to wallet/ }));

			await waitFor(() => {
				expect(captured.body).toEqual({ purse: "wallet", delta: 250 });
			});
		});

		it("takes from the wallet as a negative change", async () => {
			renderPage();
			await screen.findByRole("heading", { name: "Money" });

			const captured = captureMoney();
			await userEvent.type(screen.getByLabelText("Amount"), "250");
			await userEvent.click(screen.getByRole("button", { name: /Take from wallet/ }));

			await waitFor(() => {
				expect(captured.body).toEqual({ purse: "wallet", delta: -250 });
			});
		});

		/** Add stays available on the same amount, so the refusal has to be about Take alone. */
		it("refuses to take more than they hold, but still offers to add it", async () => {
			renderPage();
			await screen.findByRole("heading", { name: "Money" });

			await userEvent.type(screen.getByLabelText("Amount"), "999999");

			expect(screen.getByRole("button", { name: /Take from wallet/ })).toBeDisabled();
			expect(screen.getByRole("button", { name: /Add to wallet/ })).toBeEnabled();
			expect(screen.getByText(/only have 5,000 in their wallet/i)).toBeInTheDocument();
		});

		it("sends the bank when that purse is chosen", async () => {
			renderPage();
			await screen.findByRole("heading", { name: "Money" });

			const captured = captureMoney();
			await userEvent.click(screen.getByRole("button", { name: "Bank" }));
			await userEvent.type(screen.getByLabelText("Amount"), "50");
			await userEvent.click(screen.getByRole("button", { name: /Add to bank/ }));

			await waitFor(() => {
				expect(captured.body).toEqual({ purse: "bank", delta: 50 });
			});
		});
	});

	describe("the level controls", () => {
		function captureLevel(): { body: Record<string, unknown> | null } {
			const captured: { body: Record<string, unknown> | null } = { body: null };
			server.use(
				http.patch(`/api/guilds/${GUILD}/members/${USER}/level`, async ({ request }) => {
					captured.body = (await request.json()) as Record<string, unknown>;
					return HttpResponse.json(memberDetail);
				}),
			);
			return captured;
		}

		it("sets a level on its own", async () => {
			renderPage();
			await screen.findByRole("heading", { name: "Level and XP" });

			const captured = captureLevel();
			await userEvent.type(screen.getByLabelText(/Set the level to/), "20");
			await userEvent.click(screen.getByRole("button", { name: "Set level" }));

			await waitFor(() => {
				expect(captured.body).toEqual({ level: 20 });
			});
		});

		it("changes XP on its own", async () => {
			renderPage();
			await screen.findByRole("heading", { name: "Level and XP" });

			const captured = captureLevel();
			await userEvent.type(screen.getByLabelText(/change their XP by/), "400");
			await userEvent.click(screen.getByRole("button", { name: "Change XP" }));

			await waitFor(() => {
				expect(captured.body).toEqual({ xp: 400 });
			});
		});

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

		it("says the role rewards follow the level", async () => {
			renderPage();

			expect(await screen.findByText(/role rewards the new level earns/i)).toBeInTheDocument();
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
