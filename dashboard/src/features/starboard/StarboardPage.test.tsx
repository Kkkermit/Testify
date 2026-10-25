import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { StarboardPage } from "@/features/starboard/StarboardPage";
import { expectNoViolations } from "@/test/axe";
import { starboardSettings } from "@/test/fixtures/community";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<StarboardPage />, {
		route: `/guilds/${GUILD}/starboard`,
		path: "/guilds/:guildId/starboard",
	});
}

function capture(): { body: () => unknown; sent: () => number } {
	const bodies: unknown[] = [];
	server.use(
		http.patch(`/api/guilds/${GUILD}/starboard`, async ({ request }) => {
			bodies.push(await request.json());
			return HttpResponse.json(starboardSettings);
		}),
	);
	return { body: () => bodies.at(-1), sent: () => bodies.length };
}

describe("the starboard page", () => {
	it("says how many messages have reached the board", async () => {
		renderPage();

		expect(await screen.findByText(/4 messages on the board/)).toBeInTheDocument();
	});

	it("saves a new threshold when the box is left, and sends nothing else", async () => {
		const user = userEvent.setup();
		const request = capture();
		renderPage();

		const box = await screen.findByRole("textbox", { name: /stars needed/i });
		await user.clear(box);
		await user.type(box, "5");
		await user.tab();

		expect(request.body()).toEqual({ threshold: 5 });
	});

	/** An emptied box is Number("") — zero — which no message could ever reach. */
	it("refuses a threshold outside the limits rather than saving it", async () => {
		const user = userEvent.setup();
		const request = capture();
		renderPage();

		const box = await screen.findByRole("textbox", { name: /stars needed/i });
		await user.clear(box);
		await user.tab();

		expect(screen.getByText(/whole number from 1 to 50/i)).toBeInTheDocument();
		expect(box).toHaveAttribute("aria-invalid", "true");
		expect(request.sent()).toBe(0);
	});

	it("leaves the threshold alone when the box is left unchanged", async () => {
		const user = userEvent.setup();
		const request = capture();
		renderPage();

		await user.click(await screen.findByRole("textbox", { name: /stars needed/i }));
		await user.tab();

		expect(request.sent()).toBe(0);
	});

	it("sends only the switch that was flipped", async () => {
		const user = userEvent.setup();
		const request = capture();
		renderPage();

		await user.click(await screen.findByRole("switch", { name: /count the author’s own star/i }));

		expect(request.body()).toEqual({ selfStar: true });
	});

	it("cannot be switched on before it has a channel", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/starboard`, () =>
				HttpResponse.json({ ...starboardSettings, enabled: false, channelId: null }),
			),
		);
		renderPage();

		expect(await screen.findByRole("switch", { name: /repost starred messages/i })).toBeDisabled();
		expect(screen.getByText(/choose a channel first/i)).toBeInTheDocument();
	});

	it("warns when the bot cannot post in the chosen channel", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/starboard`, () => HttpResponse.json({ ...starboardSettings, canSend: false })),
		);
		renderPage();

		expect(await screen.findByText(/cannot post in #general/i)).toBeInTheDocument();
	});

	it("says so when a write is refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch(`/api/guilds/${GUILD}/starboard`, () =>
				HttpResponse.json({ error: { code: "bad_request", message: "That channel is not here." } }, { status: 400 }),
			),
		);
		renderPage();

		await user.click(await screen.findByRole("switch", { name: /count the author’s own star/i }));

		expect(await screen.findByText(/that channel is not here/i)).toBeInTheDocument();
	});

	it("offers a retry rather than an empty page when the read fails", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/starboard`, () => HttpResponse.error()));
		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/4 messages on the board/);

		await expectNoViolations(container);
	});
});
