import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { CasinoPage } from "@/features/casino/CasinoPage";
import { expectNoViolations } from "@/test/axe";
import { casinoSettings } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<CasinoPage />, {
		route: `/guilds/${GUILD}/casino`,
		path: "/guilds/:guildId/casino",
	});
}

/** Records what the page sends, answering with the stored settings merged with it. */
function capturePatches(): unknown[] {
	const bodies: unknown[] = [];
	server.use(
		http.patch(`/api/guilds/${GUILD}/casino`, async ({ request }) => {
			const body = (await request.json()) as object;
			bodies.push(body);
			return HttpResponse.json({ ...casinoSettings, ...body });
		}),
	);
	return bodies;
}

const refused = (message: string) =>
	http.patch(`/api/guilds/${GUILD}/casino`, () =>
		HttpResponse.json({ error: { code: "bad_request", message } }, { status: 400 }),
	);

describe("the casino page", () => {
	it("says how many games are running, not only whether it is open", async () => {
		renderPage();

		expect(await screen.findByText(/open, with 5 of 6 games running/i)).toBeInTheDocument();
	});

	it("says so when the casino is closed, and greys out the games", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/casino`, () => HttpResponse.json({ ...casinoSettings, enabled: false })));
		renderPage();

		expect(await screen.findByText(/every game is refused/i)).toBeInTheDocument();
		expect(screen.getByRole("switch", { name: /^Roulette/ })).toBeDisabled();
	});

	it("sends only the switch when it is flipped", async () => {
		const user = userEvent.setup();
		const bodies = capturePatches();
		renderPage();

		await user.click(await screen.findByRole("switch", { name: /open the casino/i }));

		expect(bodies).toEqual([{ enabled: false }]);
	});

	it("switches one game and leaves the rest", async () => {
		const user = userEvent.setup();
		const bodies = capturePatches();
		renderPage();

		await user.click(await screen.findByRole("switch", { name: /^Slots/ }));

		expect(bodies).toEqual([{ games: { slots: true } }]);
	});

	it("saves the limits, an empty ceiling meaning none", async () => {
		const user = userEvent.setup();
		const bodies = capturePatches();
		renderPage();

		const smallest = await screen.findByLabelText(/smallest bet/i);
		await user.clear(smallest);
		await user.type(smallest, "25");
		await user.type(screen.getByLabelText(/largest bet/i), "5000");
		await user.click(screen.getByRole("button", { name: /save changes/i }));

		expect(bodies).toEqual([{ minBet: 25, maxBet: 5000 }]);
	});

	it("names a ceiling below the floor before anything is sent", async () => {
		const user = userEvent.setup();
		const bodies = capturePatches();
		renderPage();

		await user.type(await screen.findByLabelText(/largest bet/i), "5");

		expect(await screen.findByText(/smallest bet cannot be more than the largest/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
		expect(bodies).toEqual([]);
	});

	it("keeps Save off until something changes", async () => {
		renderPage();

		expect(await screen.findByRole("button", { name: /save changes/i })).toBeDisabled();
	});

	/** A refusal belongs beside the control that caused it, not in whichever card happens to hold the warning. */
	it("shows a refused switch in the switch's own card", async () => {
		const user = userEvent.setup();
		server.use(refused("You cannot manage that server."));
		renderPage();

		await user.click(await screen.findByRole("switch", { name: /^Dice/ }));

		const games = (await screen.findByRole("heading", { name: "Games" })).closest("section, div[class*='flex-col']");
		expect(await within(games as HTMLElement).findByText(/cannot manage that server/i)).toBeInTheDocument();
		expect(screen.getAllByText(/cannot manage that server/i)).toHaveLength(1);
	});

	it("offers a retry rather than an empty page when the read fails", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/casino`, () => HttpResponse.error()));
		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/games running/i);

		await expectNoViolations(container);
	});
});
