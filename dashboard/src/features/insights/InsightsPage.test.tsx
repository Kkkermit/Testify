import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { InsightsPage } from "@/features/insights/InsightsPage";
import { expectNoViolations } from "@/test/axe";
import { insightsReport } from "@/test/fixtures/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<InsightsPage />, {
		route: `/guilds/${GUILD}/insights`,
		path: "/guilds/:guildId/insights",
	});
}

describe("the insights page", () => {
	it("describes the server from what Discord holds", async () => {
		renderPage();

		expect(await screen.findByText("1,234 (1,187 people, 47 bots)")).toBeInTheDocument();
		expect(screen.getByText("kermit")).toBeInTheDocument();
		expect(screen.getByText("Medium: on Discord for 5 minutes")).toBeInTheDocument();
	});

	/** A fresh install has counted nothing, and a page of zeros should say why rather than look broken. */
	it("says counting has not started rather than showing unexplained zeros", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/insights`, () => HttpResponse.json({ ...insightsReport, countingSince: null })),
		);
		renderPage();

		expect(await screen.findByText(/Nothing has been counted yet/)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("10 a day on average");

		await expectNoViolations(container);
	});
});
