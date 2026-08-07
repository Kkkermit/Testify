import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AutomodPage } from "@/features/automod/AutomodPage";
import { expectNoViolations } from "@/test/axe";
import { automodRules } from "@/test/handlers";
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

	it("says what each rule does rather than only naming it", async () => {
		renderPage();

		expect(await screen.findByText(/Spam — Blocks the message/)).toBeInTheDocument();
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

	it("asks for a word only when the keyword rule is chosen", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		expect(screen.queryByLabelText(/word or phrase/i)).not.toBeInTheDocument();
		await user.selectOptions(screen.getByLabelText(/what to block/i), "keyword");

		expect(screen.getByLabelText(/word or phrase/i)).toBeInTheDocument();
	});

	it("asks for a mention limit only when that rule is chosen", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await user.selectOptions(screen.getByLabelText(/what to block/i), "mention-spam");

		expect(screen.getByLabelText(/mentions to allow/i)).toBeInTheDocument();
	});

	it("sends the chosen preset when a rule is added", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.post(`/api/guilds/${GUILD}/automod`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ rules: [], canManage: true });
			}),
		);
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await user.click(screen.getByRole("button", { name: /add rule/i }));

		await waitFor(() => {
			expect(sent).toEqual({ preset: "flagged-words" });
		});
	});

	it("turns a rule off", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.patch(`/api/guilds/${GUILD}/automod/:ruleId`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ rules: [], canManage: true });
			}),
		);
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await user.click(screen.getByRole("switch", { name: /enable block spam/i }));

		await waitFor(() => {
			expect(sent).toEqual({ enabled: false });
		});
	});

	it("says so when there are no rules rather than showing an empty list", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/automod`, () => HttpResponse.json({ rules: [], canManage: true })));
		renderPage();

		expect(await screen.findByText(/no automod rules yet/i)).toBeInTheDocument();
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

	it("sends the word it was given, not just the preset", async () => {
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
		await user.type(screen.getByLabelText(/word or phrase/i), "badword");

		await user.click(screen.getByRole("button", { name: /add rule/i }));

		await waitFor(() => {
			expect(sent).toEqual({ preset: "keyword", word: "badword" });
		});
	});

	/** The warning is a heads-up, not a refusal: the strip runs on the way out and the add still goes through. */
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

	/** Leaving the word in place after an add reads as though nothing happened. */
	it("clears the word once the rule has been sent", async () => {
		const user = userEvent.setup();
		renderPage();
		await choose(user, "keyword");
		await user.type(screen.getByLabelText(/word or phrase/i), "badword");

		await user.click(screen.getByRole("button", { name: /add rule/i }));

		await waitFor(() => {
			expect(screen.getByLabelText(/word or phrase/i)).toHaveValue("");
		});
	});

	it("describes what each preset does rather than only naming it", async () => {
		const user = userEvent.setup();
		renderPage();
		await choose(user, "spam");

		expect(screen.getByText(/Messages Discord identifies as spam/i)).toBeInTheDocument();
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

/**
 * Every write here goes to Discord rather than to Mongo, so the page holds every control while one is in
 * flight. That is what makes two answers arriving out of order impossible, rather than merely guarded against.
 */
describe("a write already in flight", () => {
	it("holds every other control until it lands", async () => {
		const user = userEvent.setup();
		let release = (): void => undefined;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});

		server.use(
			http.patch(`/api/guilds/${GUILD}/automod/:ruleId`, async () => {
				await held;
				return HttpResponse.json(automodRules);
			}),
		);

		renderPage();
		await user.click(await screen.findByRole("switch", { name: /enable block spam/i }));

		await waitFor(() => {
			expect(screen.getByRole("switch", { name: /enable server rules/i })).toBeDisabled();
		});
		expect(screen.getByRole("button", { name: /remove block spam/i })).toBeDisabled();

		release();

		await waitFor(() => {
			expect(screen.getByRole("switch", { name: /enable server rules/i })).toBeEnabled();
		});
	});
});

describe("removing an automod rule", () => {
	it("sends the delete for the row it sits beside", async () => {
		const user = userEvent.setup();
		let hit: string | null = null;
		server.use(
			http.delete(`/api/guilds/${GUILD}/automod/:ruleId`, ({ params }) => {
				hit = String(params.ruleId);
				return HttpResponse.json({ rules: [], canManage: true });
			}),
		);
		renderPage();
		await screen.findByRole("heading", { name: "Block spam" });

		await user.click(screen.getByRole("button", { name: /remove block spam/i }));

		await waitFor(() => {
			expect(hit).toBe("500000000000000001");
		});
	});

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
