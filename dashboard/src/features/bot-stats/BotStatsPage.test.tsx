import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BotStatsPage } from "@/features/bot-stats/BotStatsPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const GENERAL = "400000000000000001";
const ANNOUNCEMENTS = "400000000000000002";
const OTHER = "400000000000000009";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<BotStatsPage />, {
		route: `/guilds/${GUILD}/bot-stats`,
		path: "/guilds/:guildId/bot-stats",
	});
}

function postedIn(channelId: string): void {
	server.use(http.get(`/api/guilds/${GUILD}/bot-stats`, () => HttpResponse.json({ channelId })));
}

/** Two channels the bot can post in, so moving between them is a choice the picker allows. */
function twoChannels(): void {
	server.use(
		http.get(`/api/guilds/${GUILD}/channels`, () =>
			HttpResponse.json([
				{ id: GENERAL, name: "general", kind: "text", position: 1, canSend: true },
				{ id: ANNOUNCEMENTS, name: "announcements", kind: "text", position: 2, canSend: true },
			]),
		),
	);
}

describe("the bot statistics page", () => {
	it("says nothing is posted, and offers no removal", async () => {
		renderPage();

		expect(await screen.findByText(/nothing is posted yet/i)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /remove the message/i })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /post it here/i })).toBeDisabled();
	});

	it("posts in the channel that was picked", async () => {
		const user = userEvent.setup();
		let body: unknown;
		let current: string | null = null;
		server.use(
			http.get(`/api/guilds/${GUILD}/bot-stats`, () => HttpResponse.json({ channelId: current })),
			http.put(`/api/guilds/${GUILD}/bot-stats`, async ({ request }) => {
				body = await request.json();
				current = GENERAL;
				return HttpResponse.json({ channelId: GENERAL });
			}),
		);
		renderPage();

		await user.selectOptions(await screen.findByLabelText(/^channel/i), GENERAL);
		await user.click(screen.getByRole("button", { name: /post it here/i }));

		expect(body).toEqual({ channelId: GENERAL });
		expect(await screen.findByText(/posted in #general/i)).toBeInTheDocument();
	});

	/** The button says what pressing it does: a different channel moves the message rather than adding a second. */
	it("offers to move the message once another channel is picked", async () => {
		const user = userEvent.setup();
		postedIn(GENERAL);
		twoChannels();
		renderPage();

		expect(await screen.findByRole("button", { name: /post it again/i })).toBeEnabled();
		await user.selectOptions(screen.getByLabelText(/^channel/i), ANNOUNCEMENTS);

		expect(screen.getByRole("button", { name: /move it here/i })).toBeInTheDocument();
	});

	/** Posting again into a channel that no longer exists would only be refused, so the button waits for a new one. */
	it("names a channel deleted since, and asks for another before posting", async () => {
		postedIn(OTHER);
		renderPage();

		expect(await screen.findByText(/has been deleted/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /post it again/i })).toBeDisabled();
	});

	it("removes the message", async () => {
		const user = userEvent.setup();
		let removed = false;
		postedIn(GENERAL);
		server.use(
			http.delete(`/api/guilds/${GUILD}/bot-stats`, () => {
				removed = true;
				return HttpResponse.json({ channelId: null });
			}),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: /remove the message/i }));

		expect(removed).toBe(true);
	});

	/** A refused post is a message that never appeared, and the page must say why rather than sit still. */
	it("shows the bot's refusal beside the control", async () => {
		const user = userEvent.setup();
		postedIn(GENERAL);
		server.use(
			http.put(`/api/guilds/${GUILD}/bot-stats`, () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "Pick a text channel I can send messages in." } },
					{ status: 400 },
				),
			),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: /post it again/i }));

		expect(await screen.findByText(/pick a text channel/i)).toBeInTheDocument();
	});

	it("offers a retry rather than an empty page when the read fails", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/bot-stats`, () => HttpResponse.error()));
		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/nothing is posted yet/i);

		await expectNoViolations(container);
	});
});
