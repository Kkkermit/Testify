import { type AppealDecision } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BanAppealsPage } from "@/features/appeals/BanAppealsPage";
import { expectNoViolations } from "@/test/axe";
import { appealPage } from "@/test/fixtures/moderation";
import { overview } from "@/test/fixtures/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<BanAppealsPage />, {
		route: `/guilds/${GUILD}/appeals`,
		path: "/guilds/:guildId/appeals",
	});
}

describe("the ban appeals page", () => {
	/** A moderator decides appeals; where they are posted is the server's setting. */
	it("lets a moderator decide appeals without asking for the settings", async () => {
		const asked: string[] = [];
		server.use(
			http.get("/api/guilds/:guildId/overview", () =>
				HttpResponse.json({ ...overview, yourPermissions: ["ModerateMembers", "KickMembers", "BanMembers"] }),
			),
			http.get("/api/guilds/:guildId/appeals/settings", () => {
				asked.push("/api/guilds/:guildId/appeals/settings");
				return HttpResponse.json({});
			}),
		);
		renderPage();

		expect(await screen.findByRole("heading", { name: "Appeal settings" })).toBeInTheDocument();
		expect(screen.getByText("You need the Manage Server permission in this server to use this.")).toBeInTheDocument();
		expect(asked).toEqual([]);
	});

	/** A refusal is the one decision the member has to be told the reason for, so it cannot go without one. */
	it("refuses an appeal only once a reason is typed, and sends that reason", async () => {
		const sent: AppealDecision[] = [];
		server.use(
			http.post(`/api/guilds/${GUILD}/appeals/:appealId/decision`, async ({ request }) => {
				sent.push((await request.json()) as AppealDecision);
				return HttpResponse.json(appealPage.items[0]);
			}),
		);
		renderPage();

		const row = (await screen.findByRole("heading", { name: "kate" })).closest("li") ?? document.body;
		const refuse = within(row).getByRole("button", { name: "Refuse" });
		expect(refuse).toBeDisabled();

		await userEvent.type(within(row).getByLabelText(/Reason/), "Spam is spam");
		await userEvent.click(refuse);

		await waitFor(() => {
			expect(sent).toEqual([{ status: "refused", reason: "Spam is spam" }]);
		});
	});

	/** Reading appeals asks Ban Members; a manager without it must be told, not shown a quiet empty list. */
	it("says why the list could not be read rather than showing none", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/appeals`, () =>
				HttpResponse.json({ code: "missing_permission", message: "You need Ban Members." }, { status: 403 }),
			),
		);
		renderPage();

		expect(await screen.findByRole("button", { name: /Try again/ })).toBeInTheDocument();
		expect(screen.queryByText("No appeals here")).toBeNull();
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "kate" });

		await expectNoViolations(container);
	});
});
