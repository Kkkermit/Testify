import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { StickyPage } from "@/features/sticky/StickyPage";
import { expectNoViolations } from "@/test/axe";
import { someChannels } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<StickyPage />, { route: `/guilds/${GUILD}/sticky`, path: "/guilds/:guildId/sticky" });
}

describe("the sticky page", () => {
	it("lists a sticky against its channel name rather than its id", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { name: "#general" })).toBeInTheDocument();
	});

	/** The count is the reason a sticky has not reposted yet, and the only way to see it is here. */
	it("shows how far through the repost count each one is", async () => {
		renderPage();

		expect(await screen.findByText(/3 of 5 messages since the last post/i)).toBeInTheDocument();
	});

	/** A configuration that cannot work should say so here rather than by silently never posting. */
	it("warns when Testify cannot post in the channel", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/sticky`, () =>
				HttpResponse.json({
					limit: 25,
					entries: [
						{
							channelId: "400000000000000001",
							message: "Read the rules",
							cap: 5,
							count: 3,
							posted: true,
							canSend: false,
						},
					],
				}),
			),
		);
		renderPage();

		expect(await screen.findByText(/cannot post in #general/i)).toBeInTheDocument();
	});

	/** One sticky per channel is a unique index, so a channel already used must not be offered again. */
	it("does not offer a channel that already has a sticky", async () => {
		renderPage();

		const picker = await screen.findByLabelText(/^Channel/);
		expect(picker).toBeInTheDocument();
		expect(screen.queryByRole("option", { name: "#general" })).not.toBeInTheDocument();
	});

	it("refuses to add one with no message", async () => {
		renderPage();
		await screen.findByRole("heading", { name: "#general" });

		expect(screen.getByRole("button", { name: /add sticky/i })).toBeDisabled();
	});

	it("removes one", async () => {
		const user = userEvent.setup();
		const { client } = renderPage();
		await screen.findByRole("heading", { name: "#general" });

		// The refetch on settle is what decides, so the list has to agree with the delete it just answered.
		const empty = { limit: 25, entries: [] };
		server.use(
			http.delete(`/api/guilds/${GUILD}/sticky/:channelId`, () => HttpResponse.json(empty)),
			http.get(`/api/guilds/${GUILD}/sticky`, () => HttpResponse.json(empty)),
		);

		await user.click(screen.getByRole("button", { name: /remove the sticky in general/i }));

		await waitFor(() => {
			expect(client.isMutating()).toBe(0);
		});
		// The channel comes back as an option in the add picker, so the row's own heading is what to assert on.
		await waitFor(() => {
			expect(screen.queryByRole("heading", { name: "#general" })).not.toBeInTheDocument();
		});
	});

	it("says so when there are none rather than showing an empty list", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/sticky`, () => HttpResponse.json({ limit: 25, entries: [] })));
		renderPage();

		expect(await screen.findByText(/no sticky messages yet/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "#general" });

		await expectNoViolations(container);
	});
});

describe("adding a sticky", () => {
	const FREE = "400000000000000004";

	// The fixture's only other postable channel cannot be posted in, so its option is disabled by design.
	beforeEach(() => {
		server.use(
			http.get(`/api/guilds/${GUILD}/channels`, () =>
				HttpResponse.json([...someChannels, { id: FREE, name: "rules", kind: "text", position: 4, canSend: true }]),
			),
		);
	});

	async function fillIn(user: ReturnType<typeof userEvent.setup>, message: string): Promise<void> {
		await screen.findByRole("heading", { name: "#general" });
		await user.selectOptions(screen.getByLabelText(/^Channel/), FREE);
		await user.type(screen.getByLabelText(/^Message/, { selector: "#sticky-message" }), message);
	}

	it("sends the channel, message and cap it was given", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.put(`/api/guilds/${GUILD}/sticky`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ limit: 25, entries: [] });
			}),
		);
		renderPage();
		await fillIn(user, "Read this first");

		await user.click(screen.getByRole("button", { name: /add sticky/i }));

		await waitFor(() => {
			expect(sent).toEqual({ channelId: FREE, message: "Read this first", cap: 5 });
		});
	});

	/** Leaving the typed message in place after a save reads as though the add silently failed. */
	it("clears the form once it has been sent", async () => {
		const user = userEvent.setup();
		renderPage();
		await fillIn(user, "Read this first");

		await user.click(screen.getByRole("button", { name: /add sticky/i }));

		await waitFor(() => {
			expect(screen.getByLabelText(/^Message/, { selector: "#sticky-message" })).toHaveValue("");
		});
	});

	it("counts the message against the limit as it is typed", async () => {
		const user = userEvent.setup();
		renderPage();
		await fillIn(user, "abc");

		expect(screen.getByText(/^3 of \d+$/)).toBeInTheDocument();
	});

	/** The warning is a heads-up, not a refusal: the strip runs on the way out and the save still goes through. */
	it("strips HTML on the way out, having said it would", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.put(`/api/guilds/${GUILD}/sticky`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ limit: 25, entries: [] });
			}),
		);
		renderPage();
		await fillIn(user, "<b>hi</b>");

		expect(await screen.findByText(/HTML is not allowed here/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /add sticky/i }));

		await waitFor(() => {
			expect(sent).toMatchObject({ message: "hi" });
		});
	});

	it("refuses another once the server is full", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/sticky`, () =>
				HttpResponse.json({
					limit: 1,
					entries: [
						{
							channelId: "400000000000000001",
							message: "Read the rules",
							cap: 5,
							count: 3,
							posted: true,
							canSend: true,
						},
					],
				}),
			),
		);
		renderPage();

		expect(await screen.findByText(/most stickies Testify can hold/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /add sticky/i })).toBeDisabled();
	});

	it("shows what the server said when a save is refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.put(`/api/guilds/${GUILD}/sticky`, () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "That channel is not in this server." } },
					{
						status: 400,
					},
				),
			),
		);
		renderPage();
		await fillIn(user, "Read this first");

		await user.click(screen.getByRole("button", { name: /add sticky/i }));

		expect(await screen.findByText(/not in this server/i)).toBeInTheDocument();
	});
});

describe("editing a sticky in place", () => {
	/** Save appears only once something has changed, so an untouched row cannot post a no-op write. */
	it("offers Save only after an edit", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByRole("heading", { name: "#general" });

		expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();

		await user.type(screen.getByLabelText(/^Message/, { selector: "#sticky-400000000000000001" }), "!");

		expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
	});

	it("sends the edited message and cap", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.put(`/api/guilds/${GUILD}/sticky`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ limit: 25, entries: [] });
			}),
		);
		renderPage();
		await screen.findByRole("heading", { name: "#general" });

		await user.clear(screen.getByLabelText(/^Repost after/, { selector: "#cap-400000000000000001" }));
		await user.type(screen.getByLabelText(/^Repost after/, { selector: "#cap-400000000000000001" }), "9");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(sent).toMatchObject({ channelId: "400000000000000001", cap: 9 });
		});
	});

	it("will not save a row emptied to nothing", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByRole("heading", { name: "#general" });

		await user.clear(screen.getByLabelText(/^Message/, { selector: "#sticky-400000000000000001" }));

		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
	});

	it("names a channel that has since been deleted rather than showing its id", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/channels`, () => HttpResponse.json([])));
		renderPage();

		expect(await screen.findByRole("heading", { name: "#a deleted channel" })).toBeInTheDocument();
	});
});
