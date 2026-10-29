import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { ChangesPage } from "@/features/changes/ChangesPage";
import { expectNoViolations } from "@/test/axe";
import { serverChanges } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ChangesPage />, { route: `/guilds/${GUILD}/changes`, path: "/guilds/:guildId/changes" });
}

describe("the changes page", () => {
	it("lists what Discord recorded beside what the dashboard did", async () => {
		renderPage();

		expect(await screen.findByText("marcus")).toBeInTheDocument();
		expect(screen.getByText("Banned")).toBeInTheDocument();
		expect(screen.getByText("Reason: Spamming invites")).toBeInTheDocument();
		expect(screen.getByText("Turned levelling on")).toBeInTheDocument();
		expect(screen.getByText(/By kate on the dashboard/)).toBeInTheDocument();
	});

	/** Without the permission the list would silently look like nothing happened in Discord. */
	it("says why Discord's changes are missing when the bot cannot read them", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/changes`, () =>
				HttpResponse.json({ ...serverChanges, items: [], total: 0, discordReadable: false }),
			),
		);
		renderPage();

		expect(await screen.findByText(/Give the bot View Audit Log/)).toBeInTheDocument();
		expect(screen.getByText("Nothing changed in this period.")).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("marcus");

		await expectNoViolations(container);
	});
});
