import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AutomodPage } from "@/features/automod/AutomodPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<AutomodPage />, { route: `/guilds/${GUILD}/automod`, path: "/guilds/:guildId/automod" });
}

describe("the automod page", () => {
	it("lists the rules Discord holds", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { name: "Block spam" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Server rules" })).toBeInTheDocument();
	});

	/** A rule somebody made in Discord's own UI is not one Testify is responsible for, and should not look it. */
	it("marks only the rules Testify created", async () => {
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		expect(screen.getAllByText("Added by Testify")).toHaveLength(1);
	});

	/** Without Manage Server the fetch throws, so the page has to explain rather than show an empty list. */
	it("explains the missing permission instead of showing nothing", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/automod`, () => HttpResponse.json({ rules: [], canManage: false })));
		renderPage();

		expect(await screen.findByText(/needs the Manage Server permission/i)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /add rule/i })).not.toBeInTheDocument();
	});

	/** The word is the whole rule, so Add has to stay unavailable until there is one. */
	it("refuses a keyword rule with no word", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await user.selectOptions(screen.getByLabelText(/what to block/i), "keyword");

		expect(screen.getByRole("button", { name: /add rule/i })).toBeDisabled();
	});

	it("asks for a mention limit only when that rule is chosen", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await user.selectOptions(screen.getByLabelText(/what to block/i), "mention-spam");

		expect(screen.getByLabelText(/mentions to allow/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await expectNoViolations(container);
	});
});

describe("the automod rule form", () => {
	async function choose(user: ReturnType<typeof userEvent.setup>, preset: string): Promise<void> {
		await screen.findByRole("heading", { name: "Block spam" });
		await user.selectOptions(screen.getByLabelText(/what to block/i), preset);
	}

	/** The warning is a heads-up, not a refusal: the strip runs on the way out and the add goes through. */
	it("strips HTML from the word, having said it would", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.post(`/api/guilds/${GUILD}/automod`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ rules: [], canManage: true });
			}),
		);
		renderPage();
		await choose(user, "keyword");
		await user.type(screen.getByLabelText(/word or phrase/i), "<b>rude</b>");

		expect(await screen.findByText(/HTML is not allowed here/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /add rule/i }));

		await waitFor(() => {
			expect(sent).toEqual({ preset: "keyword", word: "rude" });
		});
	});

	it("sends the mention limit that was typed", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.post(`/api/guilds/${GUILD}/automod`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ rules: [], canManage: true });
			}),
		);
		renderPage();
		await choose(user, "mention-spam");
		await user.clear(screen.getByLabelText(/mentions to allow/i));
		await user.type(screen.getByLabelText(/mentions to allow/i), "12");

		await user.click(screen.getByRole("button", { name: /add rule/i }));

		await waitFor(() => {
			expect(sent).toEqual({ preset: "mention-spam", limit: 12 });
		});
	});

	it("shows what Discord said when it refuses a rule", async () => {
		const user = userEvent.setup();
		server.use(
			http.post(`/api/guilds/${GUILD}/automod`, () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "You already have the most rules of that kind." } },
					{ status: 400 },
				),
			),
		);
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await user.click(screen.getByRole("button", { name: /add rule/i }));

		expect(await screen.findByText(/most rules of that kind/i)).toBeInTheDocument();
	});
});

describe("removing an automod rule", () => {
	it("says so when a removal is refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.delete(`/api/guilds/${GUILD}/automod/:ruleId`, () =>
				HttpResponse.json({ error: { code: "not_found", message: "That rule is already gone." } }, { status: 404 }),
			),
		);
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await user.click(screen.getByRole("button", { name: /remove block spam/i }));

		expect(await screen.findByText(/already gone/i)).toBeInTheDocument();
	});
});
