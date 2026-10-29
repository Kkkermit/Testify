import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MusicPage } from "@/features/music/MusicPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<MusicPage />, {
		route: `/guilds/${GUILD}/music`,
		path: "/guilds/:guildId/music",
	});
}

describe("the music page", () => {
	/** `onError` rollback tells a reader what the state is, never why it moved. */
	it("says so when a write is refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch(`/api/guilds/${GUILD}/music`, () =>
				HttpResponse.json({ error: { code: "forbidden", message: "You cannot manage that server." } }, { status: 403 }),
			),
		);
		renderPage();

		await user.click(await screen.findByRole("switch", { name: /enable the music system/i }));

		expect(await screen.findByText(/cannot manage that server/i)).toBeInTheDocument();
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/open to everybody/i);

		await expectNoViolations(container);
	});
});
