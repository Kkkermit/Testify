import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { TempVoicePage } from "@/features/temp-voice/TempVoicePage";
import { expectNoViolations } from "@/test/axe";
import { tempVoiceSettings } from "@/test/fixtures/channels";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<TempVoicePage />, {
		route: `/guilds/${GUILD}/temp-voice`,
		path: "/guilds/:guildId/temp-voice",
	});
}

function capture(): { body: () => unknown; sent: () => number } {
	const bodies: unknown[] = [];
	server.use(
		http.patch(`/api/guilds/${GUILD}/temp-voice`, async ({ request }) => {
			bodies.push(await request.json());
			return HttpResponse.json(tempVoiceSettings);
		}),
	);
	return { body: () => bodies.at(-1), sent: () => bodies.length };
}

function follows(earlier: Element, later: Element): boolean {
	return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("the join to create page", () => {
	it("refuses an empty name rather than saving it", async () => {
		const user = userEvent.setup();
		const request = capture();
		renderPage();

		const box = await screen.findByRole("textbox", { name: /^name/i });
		await user.clear(box);
		await user.tab();

		expect(screen.getByText(/give new channels a name/i)).toBeInTheDocument();
		expect(request.sent()).toBe(0);
	});

	it("saves a limit, and refuses one Discord would not take", async () => {
		const user = userEvent.setup();
		const request = capture();
		renderPage();

		const box = await screen.findByRole("textbox", { name: /people per channel/i });
		await user.clear(box);
		await user.type(box, "100");
		await user.tab();
		expect(screen.getByText(/whole number from 0 to 99/i)).toBeInTheDocument();
		expect(request.sent()).toBe(0);

		await user.clear(box);
		await user.type(box, "5");
		await user.tab();
		expect(request.body()).toEqual({ userLimit: 5 });
	});

	it("warns when the bot cannot make channels", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/temp-voice`, () => HttpResponse.json({ ...tempVoiceSettings, canManage: false })),
		);
		renderPage();

		expect(await screen.findByText(/needs manage channels and move members/i)).toBeInTheDocument();
	});

	/** One write serves both cards, and a refusal beside the wrong control points at the wrong setting. */
	it("shows a refused write in the card whose control sent it", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch(`/api/guilds/${GUILD}/temp-voice`, () =>
				HttpResponse.json({ error: { code: "bad_request", message: "That category is not here." } }, { status: 400 }),
			),
		);
		renderPage();

		await user.selectOptions(await screen.findByRole("combobox", { name: /made in/i }), "400000000000000005");

		const refusal = await screen.findByText(/that category is not here/i);
		expect(follows(screen.getByRole("heading", { name: /new channels/i }), refusal)).toBe(true);

		await user.click(screen.getByRole("switch", { name: /make channels for people who join/i }));

		const again = await screen.findByText(/that category is not here/i);
		expect(follows(again, screen.getByRole("heading", { name: /new channels/i }))).toBe(true);
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/2 channels open right now/);

		await expectNoViolations(container);
	});
});
