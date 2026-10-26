import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BirthdaysPage } from "@/features/birthdays/BirthdaysPage";
import { expectNoViolations } from "@/test/axe";
import { birthdayOverview } from "@/test/fixtures/community";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<BirthdaysPage />, {
		route: `/guilds/${GUILD}/birthdays`,
		path: "/guilds/:guildId/birthdays",
	});
}

function capturePatch(): { body: unknown } {
	const captured: { body: unknown } = { body: undefined };
	server.use(
		http.patch("/api/guilds/:guildId/birthdays", async ({ request }) => {
			captured.body = await request.json();
			return HttpResponse.json(birthdayOverview);
		}),
	);
	return captured;
}

describe("the birthdays page", () => {
	it("shows the posts' settings and who comes next, by day and month only", async () => {
		renderPage();

		expect(await screen.findByRole("switch", { name: /post birthdays/i })).toBeChecked();
		const upcoming = screen.getByRole("region", { name: /coming up/i });
		expect(within(upcoming).getByText("Sam")).toBeInTheDocument();
		expect(within(upcoming).getByText("25 October")).toBeInTheDocument();
		expect(upcoming.textContent).not.toMatch(/\d{4}/);
		expect(screen.getByText("2 shared")).toBeInTheDocument();
	});

	it("sends only the switch that changed", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();

		renderPage();
		await user.click(await screen.findByRole("switch", { name: /post birthdays/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ enabled: false });
		});
	});

	it("saves the message only once it is committed", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();

		renderPage();
		const box = await screen.findByLabelText("Birthday message");
		await user.clear(box);
		await user.click(box);
		await user.paste("Many happy returns, {user}!");
		expect(captured.body).toBeUndefined();

		await user.click(screen.getByRole("button", { name: /save message/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ message: "Many happy returns, {user}!" });
		});
	});

	it("offers only the placeholders a birthday has", async () => {
		renderPage();
		await screen.findByLabelText("Birthday message");

		expect(screen.getByRole("button", { name: "{user}" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "{count}" })).toBeNull();
	});

	it("gates everything on the channel, and says why", async () => {
		server.use(
			http.get("/api/guilds/:guildId/birthdays", () =>
				HttpResponse.json({ ...birthdayOverview, channelId: null, enabled: false }),
			),
		);
		renderPage();

		expect(await screen.findByRole("switch", { name: /post birthdays/i })).toBeDisabled();
		expect(screen.getByLabelText("Birthday message")).toBeDisabled();
		expect(screen.getByText(/rest of this card turns on/i)).toBeInTheDocument();
	});

	it("says so when nobody has shared one", async () => {
		server.use(
			http.get("/api/guilds/:guildId/birthdays", () =>
				HttpResponse.json({ ...birthdayOverview, shared: 0, upcoming: [] }),
			),
		);
		renderPage();

		expect(await screen.findByText(/nobody has shared a birthday yet/i)).toBeInTheDocument();
	});

	it("puts the switch back and says why when the server refuses", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/birthdays", () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "I cannot post in that channel." } },
					{ status: 400 },
				),
			),
		);
		renderPage();

		const toggle = await screen.findByRole("switch", { name: /post birthdays/i });
		await user.click(toggle);

		expect(await screen.findByText("I cannot post in that channel.")).toBeInTheDocument();
		expect(toggle).toBeChecked();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("switch", { name: /post birthdays/i });

		await expectNoViolations(container);
	});
});
