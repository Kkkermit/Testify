import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { verificationConfig } from "@/test/fixtures/server";
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
	/** An explicit button rather than a consequence of choosing a channel, so the panel is not posted mid-setup. */
	it("posts the panel only when the button is pressed", async () => {
		const user = userEvent.setup();
		const captured = capture();

		renderPage();
		await user.click(await screen.findByRole("button", { name: /update the posted panel/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ publish: true });
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
});
