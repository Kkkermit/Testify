import { type AutoResponderList } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AutoRespondersPage } from "@/features/auto-responders/AutoRespondersPage";
import { expectNoViolations } from "@/test/axe";
import { autoResponderList } from "@/test/fixtures/channels";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const RULES = autoResponderList.responders[0]?.id ?? "";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<AutoRespondersPage />, {
		route: `/guilds/${GUILD}/auto-responders`,
		path: "/guilds/:guildId/auto-responders",
	});
}

const row = async (trigger: string): Promise<HTMLElement> =>
	(await screen.findByRole("heading", { name: trigger })).closest("li") as HTMLElement;

const addCard = (): HTMLElement => screen.getByRole("region", { name: /add an auto-responder/i });

describe("the auto-responders page", () => {
	it("lists each responder with how it matches", async () => {
		renderPage();

		const rules = await row("rules");
		expect(within(rules).getByText("Anywhere, as whole words", { selector: "span" })).toBeInTheDocument();
		expect(
			within(await row("how do i get roles")).getByText("At the start of a message", { selector: "span" }),
		).toBeInTheDocument();
		expect(screen.getByText("2 of 25")).toBeInTheDocument();
	});

	it("says so when there are none rather than showing an empty list", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/auto-responders`, () => HttpResponse.json({ limit: 25, responders: [] })),
		);
		renderPage();

		expect(await screen.findByText(/no auto-responders yet/i)).toBeInTheDocument();
	});

	it("adds one with the words, match and reply it was given, then clears the form", async () => {
		const user = userEvent.setup();
		let body: unknown;
		server.use(
			http.post(`/api/guilds/${GUILD}/auto-responders`, async ({ request }) => {
				body = await request.json();
				return HttpResponse.json(autoResponderList, { status: 201 });
			}),
		);
		renderPage();
		await row("rules");

		const card = addCard();
		await user.type(within(card).getByLabelText(/words it answers/i), "hello");
		await user.selectOptions(within(card).getByLabelText(/^Matches/), "exact");
		await user.type(within(card).getByLabelText(/^Reply/), "Hi there!");
		await user.click(within(card).getByRole("button", { name: /add auto-responder/i }));

		await waitFor(() => {
			expect(body).toEqual({ trigger: "hello", match: "exact", reply: "Hi there!" });
		});
		await waitFor(() => {
			expect(within(card).getByLabelText(/words it answers/i)).toHaveValue("");
		});
	});

	/** The same rule the API enforces, so the form refuses a repeat before anything is sent. */
	it("refuses words another responder already has", async () => {
		const user = userEvent.setup();
		renderPage();
		await row("rules");

		const card = addCard();
		await user.type(within(card).getByLabelText(/words it answers/i), "RULES");
		await user.type(within(card).getByLabelText(/^Reply/), "x");

		expect(within(card).getByText(/already an auto-responder for those words/i)).toBeInTheDocument();
		expect(within(card).getByRole("button", { name: /add auto-responder/i })).toBeDisabled();
	});

	it("refuses to add another once the server is full", async () => {
		const full: AutoResponderList = {
			limit: 2,
			responders: autoResponderList.responders,
		};
		server.use(http.get(`/api/guilds/${GUILD}/auto-responders`, () => HttpResponse.json(full)));
		renderPage();
		await row("rules");

		expect(within(addCard()).getByText(/as many auto-responders as a server can keep/i)).toBeInTheDocument();
		expect(within(addCard()).getByRole("button", { name: /add auto-responder/i })).toBeDisabled();
	});

	it("saves an edited row to its own id", async () => {
		const user = userEvent.setup();
		let saved: { id: string; body: unknown } | undefined;
		server.use(
			http.put(`/api/guilds/${GUILD}/auto-responders/:id`, async ({ params, request }) => {
				saved = { id: String(params.id), body: await request.json() };
				return HttpResponse.json(autoResponderList);
			}),
		);
		renderPage();

		const rules = await row("rules");
		const reply = within(rules).getByLabelText(/^Reply/);
		await user.clear(reply);
		await user.type(reply, "See #rules.");
		await user.click(within(rules).getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(saved).toEqual({ id: RULES, body: { trigger: "rules", match: "word", reply: "See #rules." } });
		});
	});

	/** A refusal belongs beside the row that caused it, not at the foot of the page. */
	it("shows a refused save inside the row that sent it", async () => {
		const user = userEvent.setup();
		server.use(
			http.put(`/api/guilds/${GUILD}/auto-responders/:id`, () =>
				HttpResponse.json({ error: { code: "bad_request", message: "Keep the reply shorter." } }, { status: 400 }),
			),
		);
		renderPage();

		const rules = await row("rules");
		await user.type(within(rules).getByLabelText(/^Reply/), "!");
		await user.click(within(rules).getByRole("button", { name: /save/i }));

		expect(await within(rules).findByText("Keep the reply shorter.")).toBeInTheDocument();
		expect(within(await row("how do i get roles")).queryByText("Keep the reply shorter.")).toBeNull();
	});

	it("deletes one after the undo window", async () => {
		const user = userEvent.setup();
		const { client } = renderPage();
		await row("rules");

		const rest: AutoResponderList = { limit: 25, responders: autoResponderList.responders.slice(1) };
		let deleted = "";
		server.use(
			http.delete(`/api/guilds/${GUILD}/auto-responders/:id`, ({ params }) => {
				deleted = String(params.id);
				return HttpResponse.json(rest);
			}),
			http.get(`/api/guilds/${GUILD}/auto-responders`, () => HttpResponse.json(rest)),
		);

		await user.click(screen.getByRole("button", { name: /delete the auto-responder for “rules”/i }));
		expect(screen.getByText("Deleted the auto-responder for “rules”.")).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "rules" })).not.toBeInTheDocument();
		window.dispatchEvent(new Event("pagehide"));

		await waitFor(() => {
			expect(client.isMutating()).toBe(0);
		});
		expect(deleted).toBe(RULES);
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await row("rules");

		await expectNoViolations(container);
	});
});
