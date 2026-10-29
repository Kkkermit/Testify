import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ChannelToolsPage } from "@/features/channel-tools/ChannelToolsPage";
import { expectNoViolations } from "@/test/axe";
import { channelTools } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ChannelToolsPage />, {
		route: `/guilds/${GUILD}/channel-tools`,
		path: "/guilds/:guildId/channel-tools",
	});
}

describe("the channel tools page", () => {
	it("shows the first channel's state and lists what is restricted now", async () => {
		const { container } = renderPage();

		expect(await screen.findByRole("switch", { name: /locked/i })).not.toBeChecked();
		const now = screen.getByRole("region", { name: /restricted right now/i });
		expect(within(now).getByText("#memes")).toBeInTheDocument();
		expect(within(now).getByText("Slowmode 30 seconds")).toBeInTheDocument();
		await expectNoViolations(container);
	});

	it("says why a channel cannot be locked, and leaves the switch off", async () => {
		server.use(
			http.get("/api/guilds/:guildId/channel-tools", () =>
				HttpResponse.json({ channels: [{ ...channelTools.channels[0], canLock: false }] }),
			),
		);
		renderPage();

		expect(await screen.findByRole("switch", { name: /locked/i })).toBeDisabled();
		expect(screen.getByText(/locking this channel needs manage channels/i)).toBeInTheDocument();
	});

	it("puts the switch back and says why when Discord refuses", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/channel-tools/:channelId", () =>
				HttpResponse.json(
					{ error: { code: "channel_out_of_reach", message: "Locking #general needs Manage Roles." } },
					{ status: 403 },
				),
			),
		);
		renderPage();

		const toggle = await screen.findByRole("switch", { name: /locked/i });
		await user.click(toggle);

		expect(await screen.findByText("Locking #general needs Manage Roles.")).toBeInTheDocument();
		expect(toggle).not.toBeChecked();
	});
});
