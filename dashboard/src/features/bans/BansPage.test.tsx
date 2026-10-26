import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BansPage } from "@/features/bans/BansPage";
import { expectNoViolations } from "@/test/axe";
import { banPage } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<BansPage />, { route: `/guilds/${GUILD}/bans`, path: "/guilds/:guildId/bans" });
}

describe("the bans page", () => {
	it("lists everybody banned, with a softban's end", async () => {
		const { container } = renderPage();

		expect(await screen.findByText("spammer")).toBeInTheDocument();
		expect(screen.getByText("Posting invite links")).toBeInTheDocument();
		expect(screen.getByText(/softban · lifts/i)).toBeInTheDocument();
		expect(screen.getByText("2 bans")).toBeInTheDocument();
		await expectNoViolations(container);
	});

	it("asks for a reason in the row before it unbans, and sends it", async () => {
		const user = userEvent.setup();
		const captured: { path: string; body: unknown } = { path: "", body: undefined };
		server.use(
			http.post("/api/guilds/:guildId/bans/:userId/unban", async ({ request, params }) => {
				captured.path = String(params.userId);
				captured.body = await request.json();
				return HttpResponse.json(banPage);
			}),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: "Unban spammer" }));
		expect(captured.body).toBeUndefined();

		const row = screen.getByLabelText(/^reason/i).closest("li");
		await user.type(within(row ?? document.body).getByLabelText(/^reason/i), "Appealed");
		await user.click(within(row ?? document.body).getByRole("button", { name: "Unban spammer" }));

		await waitFor(() => {
			expect(captured).toEqual({ path: "100000000000000007", body: { reason: "Appealed" } });
		});
	});

	it("sends no reason when none is typed", async () => {
		const user = userEvent.setup();
		const captured: { body: unknown } = { body: undefined };
		server.use(
			http.post("/api/guilds/:guildId/bans/:userId/unban", async ({ request }) => {
				captured.body = await request.json();
				return HttpResponse.json(banPage);
			}),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: "Unban spammer" }));
		await user.click(screen.getByRole("button", { name: "Unban spammer" }));

		await waitFor(() => {
			expect(captured.body).toEqual({});
		});
	});

	it("says why it cannot show bans when the bot lacks Ban Members", async () => {
		server.use(
			http.get("/api/guilds/:guildId/bans", () =>
				HttpResponse.json({ ...banPage, readable: false, items: [], total: 0 }),
			),
		);
		renderPage();

		expect(await screen.findByText(/needs the ban members permission/i)).toBeInTheDocument();
	});

	it("says why an unban was refused, beside the row", async () => {
		const user = userEvent.setup();
		server.use(
			http.post("/api/guilds/:guildId/bans/:userId/unban", () =>
				HttpResponse.json(
					{ error: { code: "missing_permission", message: "You need the Ban Members permission." } },
					{ status: 403 },
				),
			),
		);
		renderPage();

		await user.click(await screen.findByRole("button", { name: "Unban spammer" }));
		await user.click(screen.getByRole("button", { name: "Unban spammer" }));

		expect(await screen.findByText("You need the Ban Members permission.")).toBeInTheDocument();
	});
});
