import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemberCountPage } from "@/features/member-count/MemberCountPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<MemberCountPage />, {
		route: `/guilds/${GUILD}/member-count`,
		path: "/guilds/:guildId/member-count",
	});
}

describe("the member count page", () => {
	it("shows the split between people and bots", async () => {
		renderPage();

		expect(await screen.findByText("90% people, 10% bots")).toBeInTheDocument();
		expect(screen.getByText(/joined in the last 24 hours: 3/i)).toBeInTheDocument();
	});

	it("offers a retry rather than an empty page when the read fails", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/member-count`, () => HttpResponse.error()));
		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/people and bots/i);

		await expectNoViolations(container);
	});
});
