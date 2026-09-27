import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { InsightsPage } from "@/features/insights/InsightsPage";
import { expectNoViolations } from "@/test/axe";
import { insightsReport } from "@/test/handlers";
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

	it("gives the average, the busiest hour, and the most active channels and members", async () => {
		renderPage();

		expect(await screen.findByText("10 a day on average")).toBeInTheDocument();
		expect(screen.getByText("Busiest around 20:00 UTC.")).toBeInTheDocument();
		expect(screen.getByText("#general")).toBeInTheDocument();
		expect(screen.getByText("A deleted channel")).toBeInTheDocument();
		expect(screen.getAllByRole("link", { name: /kate/ })[0]).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/members/100000000000000002`,
		);
	});

	it("lists who joined, and says so when nobody left", async () => {
		renderPage();

		expect(await screen.findByText("Recently joined")).toBeInTheDocument();
		expect(screen.getByText("Nobody has left in the last 30 days.")).toBeInTheDocument();
	});

	it("asks for the last month when told to", async () => {
		const asked: string[] = [];
		server.use(
			http.get(`/api/guilds/${GUILD}/insights`, ({ request }) => {
				asked.push(new URL(request.url).searchParams.get("days") ?? "");
				return HttpResponse.json(insightsReport);
			}),
		);
		renderPage();
		await screen.findByText("10 a day on average");

		await userEvent.click(screen.getByRole("button", { name: "Last 30 days" }));

		await waitFor(() => {
			expect(asked).toContain("30");
		});
	});

	/** A fresh install has counted nothing, and a page of zeros should say why rather than look broken. */
	it("says counting has not started rather than showing unexplained zeros", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/insights`, () => HttpResponse.json({ ...insightsReport, countingSince: null })),
		);
		renderPage();

		expect(await screen.findByText(/Nothing has been counted yet/)).toBeInTheDocument();
	});

	it("offers a retry rather than a blank page when the read fails", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/insights`, () => HttpResponse.json({}, { status: 500 })));
		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("10 a day on average");

		await expectNoViolations(container);
	});
});
