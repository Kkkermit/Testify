import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { GiveawaysPage } from "@/features/giveaways/GiveawaysPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage() {
	return renderWithProviders(<GiveawaysPage />, {
		path: "/guilds/:guildId/giveaways",
		route: `/guilds/${GUILD}/giveaways`,
	});
}

describe("the giveaways page", () => {
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
