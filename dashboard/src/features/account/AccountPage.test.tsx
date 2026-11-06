import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AccountPage } from "@/features/account/AccountPage";
import { toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { expectNoViolations } from "@/test/axe";
import { accountHistory, accountProfile, accountReminders } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function erasing(): { bodies: unknown[] } {
	const sent = { bodies: [] as unknown[] };
	server.use(
		http.post("/api/auth/erase", async ({ request }) => {
			sent.bodies.push(await request.json());
			return new HttpResponse(null, { status: 204 });
		}),
	);
	return sent;
}

describe("the account page", () => {
	it("opens on the reader's profile, filled in from what they saved", async () => {
		renderWithProviders(<AccountPage />, { path: "*", route: "/account" });

		expect(await screen.findByRole("tab", { name: "Profile", selected: true })).toBeInTheDocument();
		expect(await screen.findByLabelText("About you")).toHaveValue("I run the music nights.");
		expect(screen.getByLabelText(/Birthday/)).toHaveValue("1999-04-02");
		expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled();
	});

	/** An empty optional field is sent as null, which is what `/profile set` stores when it is left out. */
	it("saves the profile with empty optional fields as null, and says why one was refused", async () => {
		const sent: unknown[] = [];
		server.use(
			http.put("/api/account/profile", async ({ request }) => {
				sent.push(await request.json());
				return sent.length === 1
					? HttpResponse.json({ error: { code: "profanity", message: "No." } }, { status: 400 })
					: HttpResponse.json({ profile: { ...accountProfile, hobbies: null, updatedAt: "2026-11-05T10:00:00.000Z" } });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<AccountPage />, { path: "*", route: "/account" });

		await user.clear(await screen.findByLabelText(/Hobbies/));
		await user.click(screen.getByRole("button", { name: "Save profile" }));
		expect(await screen.findByText("Take out the words that aren’t allowed, then save again.")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Save profile" }));
		expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
		expect(sent[1]).toEqual({
			about: "I run the music nights.",
			favouriteSong: "Clair de Lune",
			favouriteGame: null,
			hobbies: null,
			birthday: "1999-04-02",
		});
	});

	it("deletes the profile only once the undo window has passed", async () => {
		const deleted: string[] = [];
		server.use(
			http.delete("/api/account/profile", () => {
				deleted.push("profile");
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<AccountPage />, { path: "*", route: "/account" });

		await user.click(await screen.findByRole("button", { name: "Delete profile" }));
		expect(await screen.findByLabelText("About you")).toHaveValue("");
		expect(deleted).toEqual([]);
		await user.click(screen.getByRole("button", { name: "Undo" }));
		expect(await screen.findByLabelText("About you")).toHaveValue("I run the music nights.");
	});

	it("moves a reminder to a new time and new words, sent as one instant", async () => {
		const sent: unknown[] = [];
		server.use(
			http.patch("/api/account/reminders/:id", async ({ request }) => {
				const body = (await request.json()) as { text: string; dueAt: string };
				sent.push(body);
				return HttpResponse.json({ ...accountReminders[0], ...body });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=reminders" });

		await user.click(await screen.findByRole("button", { name: "Edit the reminder “Feed the cat”" }));
		await user.clear(screen.getByLabelText("Remind you of"));
		await user.type(screen.getByLabelText("Remind you of"), "Feed both cats");
		// user-event cannot type into a datetime-local field in jsdom, so its value is set as the browser would.
		const later = toLocalInput(new Date(Date.now() + 2 * 86_400_000));
		fireEvent.change(screen.getByLabelText(/When/), { target: { value: later } });
		await user.click(screen.getByRole("button", { name: "Save reminder" }));

		await waitFor(() => {
			expect(screen.queryByRole("button", { name: "Save reminder" })).toBeNull();
		});
		expect(screen.getByText("Feed both cats")).toBeInTheDocument();
		expect(sent).toEqual([{ text: "Feed both cats", dueAt: new Date(later).toISOString() }]);
	});

	it("lists the reader's own history, naming each server and linking only where they can still manage it", async () => {
		renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=history" });

		expect(await screen.findByText("Turned levelling on")).toBeInTheDocument();
		expect(screen.getByText("You made 2 changes in the last 90 days.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Test Server" })).toHaveAttribute(
			"href",
			"/guilds/900000000000000001/changes",
		);
		expect(screen.getByText("Changed the welcome channel").closest("li")).toHaveTextContent(/A server .* has left/);
		expect(within(screen.getByText("Changed the welcome channel").closest("li")!).queryByRole("link")).toBeNull();
		expect(screen.getByRole("combobox", { name: "Server" })).toBeInTheDocument();
	});

	it("asks for one server's history when the filter picks it", async () => {
		const asked: string[] = [];
		server.use(
			http.get("/api/account/history", ({ request }) => {
				asked.push(new URL(request.url).search);
				return HttpResponse.json(accountHistory);
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=history" });

		await user.selectOptions(await screen.findByRole("combobox", { name: "Server" }), "Test Server");
		await waitFor(() => {
			expect(asked).toEqual(["?page=1", "?page=1&server=900000000000000001"]);
		});
	});

	it("says nothing has changed yet, and offers no filter, for somebody with no history", async () => {
		server.use(
			http.get("/api/account/history", () =>
				HttpResponse.json({ items: [], total: 0, page: 1, perPage: 25, servers: [] }),
			),
		);
		renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=history" });

		expect(await screen.findByText("Nothing changed yet")).toBeInTheDocument();
		expect(screen.queryByRole("combobox", { name: "Server" })).toBeNull();
	});

	/** A reminder set in a DM has no channel to ping, so it is never offered the switch that would need one. */
	it("switches a reminder to a direct message, and offers no switch for one set in a DM", async () => {
		const sent: unknown[] = [];
		server.use(
			http.put("/api/account/reminders/:id/deliver", async ({ request }) => {
				const body = (await request.json()) as { deliver: string };
				sent.push(body);
				return HttpResponse.json({ ...accountReminders[0], deliver: body.deliver });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=reminders" });

		const cat = (await screen.findByText("Feed the cat")).closest("li")!;
		const home = screen.getByText("Call home").closest("li")!;
		expect(within(home).queryByRole("switch")).toBeNull();

		await user.click(within(cat).getByRole("switch", { name: /Send it by direct message/ }));
		await waitFor(() => {
			expect(sent).toEqual([{ deliver: "dm" }]);
		});
		expect(within(cat).getByRole("switch", { name: /Send it by direct message/ })).toBeChecked();
	});

	it("cancels a reminder only once the undo window has passed", async () => {
		const cancelled: string[] = [];
		server.use(
			http.delete("/api/account/reminders/:id", ({ params }) => {
				cancelled.push(String(params.id));
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=reminders" });

		await user.click(await screen.findByRole("button", { name: "Cancel the reminder “Feed the cat”" }));
		expect(screen.queryByText("Feed the cat")).toBeNull();
		expect(cancelled).toEqual([]);
		await user.click(screen.getByRole("button", { name: "Undo" }));
		expect(await screen.findByText("Feed the cat")).toBeInTheDocument();
		expect(cancelled).toEqual([]);
	});

	/** The browser asking is signed out from the sidebar; this tab only ever ends the others. */
	it("lists this browser first with no button, and signs out the others", async () => {
		const ended: string[] = [];
		server.use(
			http.delete("/api/account/sessions/:id", ({ params }) => {
				ended.push(String(params.id));
				return new HttpResponse(null, { status: 204 });
			}),
			http.post("/api/account/sessions/others/end", () => {
				ended.push("others");
				return HttpResponse.json({ ended: 1 });
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=sessions" });

		const rows = await screen.findAllByRole("listitem");
		expect(within(rows[0]!).getByText("This browser")).toBeInTheDocument();
		expect(within(rows[0]!).queryByRole("button")).toBeNull();

		await user.click(within(rows[1]!).getByRole("button", { name: "Sign out" }));
		await user.click(screen.getByRole("button", { name: "Sign out everywhere else" }));
		await waitFor(() => {
			expect(ended).toEqual(["e".repeat(24), "others"]);
		});
		expect(await screen.findByText("Signed out of 1 other browser.")).toHaveAttribute("role", "status");
	});

	/** Reminder words and change summaries are whatever somebody typed, so they are text and never markup. */
	it("shows typed markup as text, never as elements", async () => {
		const markup = `<img src=x onerror="alert(1)"><script>alert(1)</script>`;
		server.use(
			http.get("/api/account/reminders", () => HttpResponse.json([{ ...accountReminders[0], text: markup }])),
			http.get("/api/account/history", () =>
				HttpResponse.json({ ...accountHistory, items: [{ ...accountHistory.items[0], summary: markup }] }),
			),
		);
		const reminders = renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=reminders" });
		expect(await screen.findByText(markup)).toBeInTheDocument();
		expect(reminders.container.querySelector("img, script")).toBeNull();
		reminders.unmount();

		const history = renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=history" });
		expect(await screen.findByText(markup)).toBeInTheDocument();
		expect(history.container.querySelector("img, script")).toBeNull();
	});

	it("passes axe on every tab", async () => {
		for (const tab of ["profile", "history", "reminders", "sessions"]) {
			const { container, unmount } = renderWithProviders(<AccountPage />, { path: "*", route: `/account?tab=${tab}` });
			await screen.findByRole("tabpanel");
			await waitFor(() => {
				expect(container.querySelector(".skeleton-sheen")).toBeNull();
			});
			await expectNoViolations(container);
			unmount();
		}
	});

	/** It cannot be undone, so nothing is sent until the reader has typed their own username back. */
	it("deletes nothing until the username is typed, then deletes and leaves for the home page", async () => {
		const sent = erasing();
		const user = userEvent.setup();
		const { pathname } = renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=data" });

		await user.click(await screen.findByRole("button", { name: "Delete my data" }));
		expect(screen.getByText(/can’t be undone/)).toBeInTheDocument();

		const confirm = screen.getByRole("button", { name: "Delete everything" });
		await user.type(await screen.findByLabelText(/type your username, someone/i), "somebody");
		expect(confirm).toBeDisabled();

		await user.clear(screen.getByLabelText(/type your username/i));
		await user.type(screen.getByLabelText(/type your username/i), "someone");
		await user.click(confirm);

		await waitFor(() => {
			expect(pathname()).toBe("/");
		});
		expect(sent.bodies).toEqual([{ confirm: "someone" }]);
	});

	it("says so when the delete fails, and stays where it is", async () => {
		server.use(
			http.post("/api/auth/erase", () => HttpResponse.json({ error: { code: "x", message: "x" } }, { status: 500 })),
		);
		const user = userEvent.setup();
		const { pathname } = renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=data" });

		await user.click(await screen.findByRole("button", { name: "Delete my data" }));
		await user.type(await screen.findByLabelText(/type your username, someone/i), "someone");
		await user.click(screen.getByRole("button", { name: "Delete everything" }));

		expect(await screen.findByText(/couldn’t be deleted/)).toBeInTheDocument();
		expect(pathname()).toBe("/account");
	});

	it("passes axe with the confirmation open", async () => {
		const user = userEvent.setup();
		const { container } = renderWithProviders(<AccountPage />, { path: "*", route: "/account?tab=data" });

		await user.click(await screen.findByRole("button", { name: "Delete my data" }));
		await screen.findByLabelText(/type your username, someone/i);
		await expectNoViolations(container);
	});
});
