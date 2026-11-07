import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AccessPage } from "@/features/access/AccessPage";
import { expectNoViolations } from "@/test/axe";
import { helper } from "@/test/fixtures/access";
import { aGuild } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderPage() {
	return renderWithProviders(<AccessPage />, {
		path: "/guilds/:guildId/access",
		route: `/guilds/${aGuild.id}/access`,
	});
}

describe("the dashboard access screen", () => {
	it("lists who has access, what they can open, who gave it and when they were last here", async () => {
		const { container } = renderPage();

		const row = await screen.findByRole("link", { name: /helper/i });
		expect(row).toHaveAttribute("href", `/guilds/${aGuild.id}/access/${helper.userId}`);
		expect(within(row).getByText(/2 screens · added by someone/i)).toBeInTheDocument();
		expect(within(row).getByText(/last here/i)).toBeInTheDocument();
		await expectNoViolations(container);
	});

	/** A section's box ticks every screen under it, so giving somebody all of moderation is one tick. */
	it("gives a member a whole section by ID, in the order the screens are listed", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.post("/api/guilds/:guildId/access", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json(helper, { status: 201 });
			}),
		);
		renderPage();

		await user.type(await screen.findByLabelText(/their user id/i), `<@${helper.userId}>`);
		await user.click(screen.getByRole("checkbox", { name: "Moderation" }));
		await user.click(screen.getByRole("checkbox", { name: "AutoMod" }));
		await user.click(screen.getByRole("button", { name: /give access to 10 screens/i }));

		expect(sent).toEqual({
			userId: helper.userId,
			areas: [
				"raid-protection",
				"warnings",
				"cases",
				"bans",
				"appeals",
				"modmail",
				"channel-tools",
				"tickets",
				"audit-log",
				"changes",
			],
		});
		expect(await screen.findByLabelText(/their user id/i)).toHaveValue("");
	});

	it("will not send something that is not an ID or with no screen chosen, and words the server's refusal", async () => {
		const user = userEvent.setup();
		server.use(
			http.post("/api/guilds/:guildId/access", () =>
				HttpResponse.json({ error: { code: "already_full", message: "x" } }, { status: 409 }),
			),
		);
		renderPage();

		const field = await screen.findByLabelText(/their user id/i);
		await user.type(field, "somebody");
		expect(screen.getByText(/that isn’t a user id/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /give access/i })).toBeDisabled();

		await user.clear(field);
		await user.type(field, helper.userId);
		expect(screen.getByRole("button", { name: /give access/i })).toBeDisabled();
		await user.click(screen.getByRole("checkbox", { name: "Bans" }));
		await user.click(screen.getByRole("button", { name: /give access to 1 screen/i }));

		expect(await screen.findByText(/they already see every screen here/i)).toBeInTheDocument();
	});
});
