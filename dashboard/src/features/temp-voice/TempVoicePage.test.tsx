import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { TempVoicePage } from "@/features/temp-voice/TempVoicePage";
import { expectNoViolations } from "@/test/axe";
import { tempVoiceSettings } from "@/test/handlers";
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
	it("says how many made channels are open", async () => {
		renderPage();

		expect(await screen.findByText(/2 channels open right now/)).toBeInTheDocument();
	});

	it("offers voice channels for the lobby and categories for where new ones go", async () => {
		renderPage();

		const lobby = await screen.findByRole("combobox", { name: /^lobby/i });
		const category = screen.getByRole("combobox", { name: /made in/i });
		expect(within(lobby).getByRole("option", { name: "Voice" })).toBeInTheDocument();
		expect(within(lobby).queryByRole("option", { name: "Support" })).not.toBeInTheDocument();
		expect(within(category).getByRole("option", { name: "Support" })).toBeInTheDocument();
		expect(within(category).queryByRole("option", { name: "Voice" })).not.toBeInTheDocument();
	});

	it("offers to make a lobby only while there is none", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/temp-voice`, () =>
				HttpResponse.json({ ...tempVoiceSettings, enabled: false, lobbyChannelId: null }),
			),
		);
		renderPage();

		expect(await screen.findByRole("button", { name: /make a lobby/i })).toBeInTheDocument();
		expect(screen.getByRole("switch", { name: /make channels for people who join/i })).toBeDisabled();
	});

	it("makes a lobby when asked, and stops offering one once it exists", async () => {
		const user = userEvent.setup();
		let made = 0;
		let lobby: string | null = null;
		server.use(
			http.get(`/api/guilds/${GUILD}/temp-voice`, () =>
				HttpResponse.json({ ...tempVoiceSettings, enabled: lobby !== null, lobbyChannelId: lobby }),
			),
			http.post(`/api/guilds/${GUILD}/temp-voice/lobby`, () => {
				made += 1;
				lobby = "400000000000000003";
				return HttpResponse.json({ ...tempVoiceSettings, lobbyChannelId: lobby });
			}),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: /make a lobby/i }));

		expect(made).toBe(1);
		expect(await screen.findByRole("combobox", { name: /^lobby/i })).toHaveValue("400000000000000003");
		expect(screen.queryByRole("button", { name: /make a lobby/i })).not.toBeInTheDocument();
	});

	it("says why a lobby could not be made", async () => {
		const user = userEvent.setup();
		server.use(
			http.get(`/api/guilds/${GUILD}/temp-voice`, () =>
				HttpResponse.json({ ...tempVoiceSettings, lobbyChannelId: null }),
			),
			http.post(`/api/guilds/${GUILD}/temp-voice/lobby`, () =>
				HttpResponse.json(
					{ error: { code: "missing_permission", message: "You need Manage Channels in this server." } },
					{ status: 403 },
				),
			),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: /make a lobby/i }));

		expect(await screen.findByText(/you need manage channels/i)).toBeInTheDocument();
	});

	it("saves a trimmed name when the box is left", async () => {
		const user = userEvent.setup();
		const request = capture();
		renderPage();

		const box = await screen.findByRole("textbox", { name: /^name/i });
		await user.clear(box);
		await user.type(box, "  Room of {{user}  ");
		await user.tab();

		expect(request.body()).toEqual({ nameTemplate: "Room of {user}" });
	});

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

	it("offers a retry rather than an empty page when the read fails", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/temp-voice`, () => HttpResponse.error()));
		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/2 channels open right now/);

		await expectNoViolations(container);
	});
});
