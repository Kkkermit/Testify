import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { GiveawaysPage } from "@/features/giveaways/GiveawaysPage";
import { expectNoViolations } from "@/test/axe";
import { giveawayList } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage() {
	return renderWithProviders(<GiveawaysPage />, {
		path: "/guilds/:guildId/giveaways",
		route: `/guilds/${GUILD}/giveaways`,
	});
}

/** Records what a request sent, so a test can assert on one endpoint without stubbing the rest. */
function capture(path: string, method: "post" | "delete" = "post"): { body: unknown; hit: boolean } {
	const seen: { body: unknown; hit: boolean } = { body: undefined, hit: false };
	const handler = method === "delete" ? http.delete : http.post;

	server.use(
		handler(`/api/guilds/:guildId/giveaways${path}`, async ({ request }) => {
			seen.hit = true;
			seen.body = method === "delete" ? null : await request.json();
			return HttpResponse.json(giveawayList);
		}),
	);

	return seen;
}

describe("the giveaways page", () => {
	it("lists what is running and what has finished", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { name: "A copy of the game" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Server boost" })).toBeInTheDocument();
		expect(screen.getByText("Running")).toBeInTheDocument();
		expect(screen.getByText("Ended")).toBeInTheDocument();
	});

	/** The whole reason for the screen: Discord makes you read a message id out of a channel and retype it. */
	it("puts the actions beside the giveaway rather than asking for an id", async () => {
		renderPage();

		const running = (await screen.findByRole("heading", { name: "A copy of the game" })).closest("li");

		expect(within(running as HTMLElement).getByRole("button", { name: /end now/i })).toBeInTheDocument();
		expect(screen.queryByLabelText(/message id/i)).toBeNull();
	});

	/** Rerolling redraws from the entrants, so it only makes sense once a giveaway has actually drawn. */
	it("offers reroll only on a finished giveaway that drew somebody", async () => {
		renderPage();

		const ended = (await screen.findByRole("heading", { name: "Server boost" })).closest("li");
		const running = screen.getByRole("heading", { name: "A copy of the game" }).closest("li");

		expect(within(ended as HTMLElement).getByRole("button", { name: /reroll/i })).toBeInTheDocument();
		expect(within(running as HTMLElement).queryByRole("button", { name: /reroll/i })).toBeNull();
	});

	it("sends the draft the form was filled in with", async () => {
		const user = userEvent.setup();
		const captured = capture("");

		renderPage();
		await user.selectOptions(await screen.findByLabelText("Channel"), "400000000000000001");
		await user.type(screen.getByLabelText("Prize"), "Nitro");

		await user.click(screen.getByRole("button", { name: /start it/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({
				channelId: "400000000000000001",
				prize: "Nitro",
				winnerCount: 1,
				durationMs: 86_400_000,
			});
		});
	});

	it("will not start one without a channel and a prize", async () => {
		renderPage();

		await screen.findByRole("heading", { name: "A copy of the game" });

		expect(screen.getByRole("button", { name: /start it/i })).toBeDisabled();
	});

	it("ends a running giveaway from its own row", async () => {
		const user = userEvent.setup();
		const captured = capture("/:messageId/end");

		renderPage();
		const running = (await screen.findByRole("heading", { name: "A copy of the game" })).closest("li");
		await user.click(within(running as HTMLElement).getByRole("button", { name: /end now/i }));

		await waitFor(() => {
			expect(captured.hit).toBe(true);
		});
	});

	it("explains a refusal from the API", async () => {
		const user = userEvent.setup();
		server.use(
			http.post("/api/guilds/:guildId/giveaways/:messageId/end", () =>
				HttpResponse.json({ error: { code: "bad_request", message: "That giveaway already ended." } }, { status: 400 }),
			),
		);

		renderPage();
		const running = (await screen.findByRole("heading", { name: "A copy of the game" })).closest("li");
		await user.click(within(running as HTMLElement).getByRole("button", { name: /end now/i }));

		expect(await screen.findByText("That giveaway already ended.")).toBeInTheDocument();
	});

	it("says so when there are none yet", async () => {
		server.use(http.get("/api/guilds/:guildId/giveaways", () => HttpResponse.json({ giveaways: [] })));

		renderPage();

		expect(await screen.findByText(/no giveaways yet/i)).toBeInTheDocument();
	});

	it("says so when the list cannot be loaded", async () => {
		server.use(
			http.get("/api/guilds/:guildId/giveaways", () =>
				HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
			),
		);

		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "A copy of the game" });

		await expectNoViolations(container);
	});
});
