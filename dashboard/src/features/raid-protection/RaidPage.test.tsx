import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { RaidPage } from "@/features/raid-protection/RaidPage";
import { expectNoViolations } from "@/test/axe";
import { raidOverview } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<RaidPage />, {
		route: `/guilds/${GUILD}/raid-protection`,
		path: "/guilds/:guildId/raid-protection",
	});
}

function capturePatch(): { body: unknown } {
	const captured: { body: unknown } = { body: undefined };
	server.use(
		http.patch("/api/guilds/:guildId/raid-protection", async ({ request }) => {
			captured.body = await request.json();
			return HttpResponse.json(raidOverview);
		}),
	);
	return captured;
}

describe("the raid protection page", () => {
	it("shows what is being watched, and that nothing here kicks or bans", async () => {
		const { container } = renderPage();

		expect(await screen.findByRole("switch", { name: /watch new joins/i })).toBeChecked();
		expect(screen.getByLabelText(/minimum account age/i)).toHaveValue("7");
		expect(screen.getByRole("combobox", { name: "Unit" })).toHaveValue("days");
		expect(screen.getByText(/kicking and banning stay a moderator’s decision/i)).toBeInTheDocument();
		await expectNoViolations(container);
	});

	/** A minimum in days alone held back nobody for less than a day, which is most of what a raid needs. */
	it("saves an age in minutes or hours once the number and its unit are both chosen", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();
		renderPage();

		const age = await screen.findByLabelText(/minimum account age/i);
		await user.selectOptions(screen.getByRole("combobox", { name: "Unit" }), "minutes");
		await user.clear(age);
		await user.type(age, "30");
		// Moving on to the unit is still choosing, so only leaving both saves.
		await user.tab();
		expect(captured.body).toBeUndefined();
		await user.tab();

		await waitFor(() => {
			expect(captured.body).toEqual({ minAccountAgeMinutes: 30 });
		});
	});

	it("refuses an age past 28 days in any unit, and saves nothing", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();
		renderPage();

		const age = await screen.findByLabelText(/minimum account age/i);
		await user.selectOptions(screen.getByRole("combobox", { name: "Unit" }), "hours");
		await user.clear(age);
		await user.type(age, "673");
		await user.tab();
		await user.tab();

		expect(screen.getByText(/choose a whole number, up to 28 days in all/i)).toBeInTheDocument();
		expect(captured.body).toBeUndefined();
	});

	it("chooses who an alert pings, and nobody by default", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();

		renderPage();
		const ping = await screen.findByLabelText(/ping on a spike/i);
		expect(ping).toHaveValue("");

		await user.selectOptions(ping, "Member");

		await waitFor(() => {
			expect(captured.body).toEqual({ pingRoleId: "300000000000000001" });
		});
	});

	it("cannot be switched on with nothing to do, and says what to set first", async () => {
		server.use(
			http.get("/api/guilds/:guildId/raid-protection", () =>
				HttpResponse.json({ ...raidOverview, enabled: false, minAccountAgeMinutes: 0, alertChannelId: null }),
			),
		);
		renderPage();

		expect(await screen.findByRole("switch", { name: /watch new joins/i })).toBeDisabled();
		expect(screen.getByText(/set a minimum account age or choose an alert channel first/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/ping on a spike/i)).toBeDisabled();
	});

	it("says when a hold cannot happen or a ping cannot land", async () => {
		server.use(
			http.get("/api/guilds/:guildId/raid-protection", () =>
				HttpResponse.json({ ...raidOverview, canHold: false, canPing: false }),
			),
		);
		renderPage();

		expect(await screen.findByText(/needs the moderate members permission/i)).toBeInTheDocument();
		expect(screen.getByText(/that role is not mentionable/i)).toBeInTheDocument();
	});

	it("puts the switch back and says why when the server refuses", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/raid-protection", () =>
				HttpResponse.json(
					{ error: { code: "missing_permission", message: "You need the Moderate Members permission." } },
					{ status: 403 },
				),
			),
		);
		renderPage();

		const toggle = await screen.findByRole("switch", { name: /watch new joins/i });
		await user.click(toggle);

		expect(await screen.findByText("You need the Moderate Members permission.")).toBeInTheDocument();
		expect(toggle).toBeChecked();
	});
});
