import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { WeekPage } from "@/features/week/WeekPage";
import { expectNoViolations } from "@/test/axe";
import { busyWeek } from "@/test/fixtures/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderWeek(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<WeekPage />, { route: `/guilds/${GUILD}/week`, path: "/guilds/:guildId/week" });
}

describe("this week", () => {
	it("lists what is coming under its day, each opening the page that sets it up", async () => {
		server.use(http.get("/api/guilds/:guildId/week", () => HttpResponse.json(busyWeek())));
		const { container } = renderWeek();

		expect(await screen.findByText("2 things are planned for the next seven days.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /The giveaway for Nitro ends/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/giveaways`,
		);
		expect(screen.getByRole("link", { name: /The lottery draw/ })).toHaveAttribute("href", `/guilds/${GUILD}/lottery`);
		await expectNoViolations(container);
	});

	it("says the week is quiet rather than drawing nothing", async () => {
		renderWeek();

		expect(await screen.findByText("Nothing is planned for the next seven days.")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "A quiet week" })).toBeInTheDocument();
	});

	/** A week that failed to read must not look like a quiet one. */
	it("says so when it cannot be read", async () => {
		server.use(http.get("/api/guilds/:guildId/week", () => HttpResponse.json({}, { status: 500 })));
		renderWeek();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(screen.queryByText("A quiet week")).not.toBeInTheDocument();
	});
});
