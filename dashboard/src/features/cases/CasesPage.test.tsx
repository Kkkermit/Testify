import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { CasesPage } from "@/features/cases/CasesPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<CasesPage />, { route: `/guilds/${GUILD}/cases`, path: "/guilds/:guildId/cases" });
}

describe("the cases page", () => {
	/** A warning from before cases is listed rather than dropped, and says it has no number. */
	it("shows a warning from before cases, unnumbered", async () => {
		renderPage();

		expect(await screen.findByText("Earlier warning")).toBeInTheDocument();
	});

	it("warns when the bot cannot post in the log channel", async () => {
		server.use(
			http.get("/api/guilds/:guildId/cases/settings", () =>
				HttpResponse.json({ logChannelId: "400000000000000001", canSend: false }),
			),
		);
		renderPage();

		expect(await screen.findByText(/recorded but not posted/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("Case 2");

		await expectNoViolations(container);
	});
});
