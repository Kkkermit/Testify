import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { verificationConfig } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage() {
	return renderWithProviders(<SettingsPage />, {
		path: "/guilds/:guildId/settings",
		route: `/guilds/${GUILD}/settings`,
	});
}

function capture(): { body: unknown } {
	const captured: { body: unknown } = { body: undefined };
	server.use(
		http.patch("/api/guilds/:guildId/verification", async ({ request }) => {
			captured.body = await request.json();
			return HttpResponse.json(verificationConfig);
		}),
	);
	return captured;
}

describe("the verification section", () => {
	it("shows what is configured, and how many have passed", async () => {
		renderPage();

		expect(await screen.findByText(/42 verified so far/)).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Verification" })).toBeInTheDocument();
	});

	/**
	 * The panel is a message in a public channel. Making it an explicit button rather than a consequence of
	 * choosing a channel is the difference between posting when asked and posting mid-setup.
	 */
	it("posts the panel only when the button is pressed", async () => {
		const user = userEvent.setup();
		const captured = capture();

		renderPage();
		await user.click(await screen.findByRole("button", { name: /update the posted panel/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ publish: true });
		});
	});

	it("sends only the role when the role is changed", async () => {
		const user = userEvent.setup();
		const captured = capture();

		renderPage();
		await user.selectOptions(await screen.findByLabelText(/give them this role/i), "300000000000000002");

		await waitFor(() => {
			expect(captured.body).toEqual({ roleId: "300000000000000002" });
		});
	});

	/** A role Discord would refuse is named on the form rather than at the moment somebody tries to verify. */
	it("warns when the chosen role sits above the bot", async () => {
		server.use(
			http.get("/api/guilds/:guildId/verification", () =>
				HttpResponse.json({ ...verificationConfig, roleTooHigh: true }),
			),
		);

		renderPage();

		expect(await screen.findByText(/sits at or above/i)).toBeInTheDocument();
	});

	it("says what is still missing rather than offering a button that would fail", async () => {
		server.use(
			http.get("/api/guilds/:guildId/verification", () =>
				HttpResponse.json({ ...verificationConfig, enabled: false, channelId: null, roleId: null, posted: false }),
			),
		);

		renderPage();

		expect(await screen.findByText(/choose a channel and a role/i)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /post the panel/i })).toBeNull();
		expect(screen.getByRole("switch", { name: /verify new members/i })).toBeDisabled();
	});
});
