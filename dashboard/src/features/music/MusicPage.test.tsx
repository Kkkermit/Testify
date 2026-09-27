import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MusicPage } from "@/features/music/MusicPage";
import { expectNoViolations } from "@/test/axe";
import { musicSettings } from "@/test/handlers";
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
	it("says who can use the player rather than only whether it is on", async () => {
		renderPage();

		expect(await screen.findByText(/open to everybody/i)).toBeInTheDocument();
	});

	it("says so when the system is switched off", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/music`, () => HttpResponse.json({ ...musicSettings, enabled: false })));
		renderPage();

		expect(await screen.findByText(/every music command is refused/i)).toBeInTheDocument();
	});

	it("sends only the switch when it is flipped", async () => {
		const user = userEvent.setup();
		let body: unknown;
		server.use(
			http.patch(`/api/guilds/${GUILD}/music`, async ({ request }) => {
				body = await request.json();
				return HttpResponse.json({ ...musicSettings, enabled: false });
			}),
		);
		renderPage();

		await user.click(await screen.findByRole("switch", { name: /enable the music system/i }));

		expect(body).toEqual({ enabled: false });
	});

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

	it("offers a retry rather than an empty page when the read fails", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/music`, () => HttpResponse.error()));
		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/open to everybody/i);

		await expectNoViolations(container);
	});
});
